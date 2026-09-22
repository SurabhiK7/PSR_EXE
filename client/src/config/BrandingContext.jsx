import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client.js';
import { ORG_NAME as DEFAULT_ORG_NAME } from './branding.js';

const BrandingContext = createContext(DEFAULT_ORG_NAME);

// Fetches the admin-configured organization name once on mount, falling back to the
// hardcoded default (see branding.js) until it loads or if the request fails.
export function BrandingProvider({ children }) {
  const [orgName, setOrgName] = useState(DEFAULT_ORG_NAME);

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => {
        if (res.data?.organizationName) setOrgName(res.data.organizationName);
      })
      .catch(() => {});
  }, []);

  return <BrandingContext.Provider value={orgName}>{children}</BrandingContext.Provider>;
}

export function useOrgName() {
  return useContext(BrandingContext);
}
