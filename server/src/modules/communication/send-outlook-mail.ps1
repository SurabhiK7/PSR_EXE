# Sends a message through the locally installed, already signed-in desktop Outlook application
# via its COM object model, with the subject/body (and To/CC, if given) and any attached files.
# The message is sent immediately (Send) using the signed-in mailbox - no review step.
#
# Mail fields are passed via a JSON file (not command-line args) to avoid any argument
# escaping/injection issues with special characters in the subject/body.
param(
  [Parameter(Mandatory = $true)][string]$DataPath
)

$ErrorActionPreference = 'Stop'

try {
  $data = Get-Content -Raw -LiteralPath $DataPath | ConvertFrom-Json

  # Start Outlook as an independent process first if it isn't already running. Otherwise the
  # instance auto-started by the COM call below is torn down the moment this short-lived script
  # exits, which closes the just-opened draft before the user ever sees it.
  if (-not (Get-Process -Name 'OUTLOOK' -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath 'outlook.exe' -WindowStyle Minimized
    for ($i = 0; $i -lt 30 -and -not (Get-Process -Name 'OUTLOOK' -ErrorAction SilentlyContinue); $i++) {
      Start-Sleep -Milliseconds 500
    }
  }

  $outlook = New-Object -ComObject Outlook.Application

  # Force the MAPI session to log on so a freshly-started Outlook is fully initialized before we
  # create/display the item; skipping this can make Display() fail on a cold start.
  $namespace = $outlook.GetNamespace('MAPI')
  $namespace.Logon($null, $null, $false, $false)

  $mail = $outlook.CreateItem(0) # 0 = olMailItem

  if ($data.to) { $mail.To = $data.to }
  if ($data.cc) { $mail.CC = $data.cc }
  $mail.Subject = $data.subject
  if ($data.html) {
    $mail.HTMLBody = $data.html
  } else {
    $mail.Body = $data.body
  }

  if ($data.attachmentPaths) {
    foreach ($attPath in $data.attachmentPaths) {
      if ($attPath -and (Test-Path -LiteralPath $attPath)) {
        [void]$mail.Attachments.Add($attPath)
      }
    }
  }

  # Inline images (e.g. the org logo) - added as hidden attachments tagged with a Content-ID so
  # `<img src="cid:...">` in the HTML body resolves to them. Outlook's Word-based HTML renderer
  # does not reliably display base64 data-URI images, so this is the reliable alternative.
  $PR_ATTACH_CONTENT_ID = 'http://schemas.microsoft.com/mapi/proptag/0x3712001E'
  $PR_ATTACHMENT_HIDDEN = 'http://schemas.microsoft.com/mapi/proptag/0x7FFE000B'
  if ($data.inlineImages) {
    foreach ($img in $data.inlineImages) {
      if ($img.path -and (Test-Path -LiteralPath $img.path)) {
        $attachment = $mail.Attachments.Add($img.path)
        $attachment.PropertyAccessor.SetProperty($PR_ATTACH_CONTENT_ID, $img.contentId)
        $attachment.PropertyAccessor.SetProperty($PR_ATTACHMENT_HIDDEN, $true)
      }
    }
  }

  # Resolve To/CC against the address book so Outlook can deliver on Send.
  if (-not $mail.Recipients.ResolveAll()) {
    $unresolved = @()
    foreach ($r in $mail.Recipients) {
      if (-not $r.Resolved) { $unresolved += $r.Name }
    }
    throw "Could not resolve recipient(s): $($unresolved -join ', ')"
  }

  # Force a copy to be kept in Sent Items. Programmatic Send() does not reliably save a copy
  # unless the target folder is set explicitly, so point it at the default Sent Items folder
  # (olFolderSentMail = 5) and ensure the item is not discarded after submit.
  $namespace = $outlook.GetNamespace('MAPI')
  $mail.DeleteAfterSubmit = $false
  try {
    $sentFolder = $namespace.GetDefaultFolder(5)
    if ($sentFolder) { $mail.SaveSentMessageFolder = $sentFolder }
  } catch {
    # If the Sent Items folder can't be resolved, still send - just without forcing the copy.
  }

  $mail.Send()

  # In Exchange cached mode the Sent Items copy is written locally and only uploaded to the
  # server on the next sync. When this script spawned a headless Outlook instance (i.e. the
  # user did not already have Outlook open), exiting immediately would close Outlook before
  # that upload happens, so the copy never appears in Sent Items on the server / other clients.
  # Trigger a send/receive and wait briefly to let the upload complete.
  try {
    $syncs = $namespace.SyncObjects
    for ($i = 1; $i -le $syncs.Count; $i++) { $syncs.Item($i).Start() }
  } catch {}
  Start-Sleep -Seconds 5

  Write-Output 'SENT'
}
catch {
  Write-Error $_.Exception.Message
  exit 1
}
