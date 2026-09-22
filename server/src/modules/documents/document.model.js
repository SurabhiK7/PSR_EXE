const mongoose = require('mongoose');

const { Schema } = mongoose;

const documentSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    documentName: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    fileType: { type: String, default: '' },
    filePath: { type: String, required: true },
    size: { type: Number, default: 0 },
    includeInCommunication: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
