import { Workspace } from '../types';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FILE_NAME = 'researcherx_data.json';

export interface DriveConfig {
  clientId: string;
  isConnected: boolean;
  lastSyncedAt?: number;
}

class DriveService {
  private tokenClient: any;
  private gapiInited = false;
  private gisInited = false;
  private clientId = '';

  // Initialize the Google API client
  init(clientId: string): Promise<void> {
    this.clientId = clientId;
    return new Promise((resolve, reject) => {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.onload = () => {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              discoveryDocs: [DISCOVERY_DOC],
            });
            this.gapiInited = true;
            this.checkInit(resolve);
          } catch (err) {
            reject(err);
          }
        });
      };
      document.body.appendChild(gapiScript);

      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: '', // defined at request time
        });
        this.gisInited = true;
        this.checkInit(resolve);
      };
      document.body.appendChild(gisScript);
    });
  }

  private checkInit(resolve: () => void) {
    if (this.gapiInited && this.gisInited) {
      resolve();
    }
  }

  // Trigger Google Sign In
  signIn(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) return reject('Drive API not initialized');

      this.tokenClient.callback = async (resp: any) => {
        if (resp.error) {
          reject(resp);
        }
        resolve(resp.access_token);
      };

      if (window.gapi.client.getToken() === null) {
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        this.tokenClient.requestAccessToken({ prompt: '' });
      }
    });
  }

  // Save workspaces to Google Drive
  async saveToDrive(data: Workspace[]): Promise<void> {
    try {
      // 1. Find if file exists
      const response = await window.gapi.client.drive.files.list({
        q: `name = '${FILE_NAME}' and trashed = false`,
        fields: 'files(id, name)',
      });

      const files = response.result.files;
      const fileContent = JSON.stringify(data, null, 2);
      const fileMetadata = {
        name: FILE_NAME,
        mimeType: 'application/json',
      };

      if (files && files.length > 0) {
        // Update existing file
        const fileId = files[0].id;
        await this.updateFile(fileId, fileContent);
      } else {
        // Create new file
        await this.createFile(fileMetadata, fileContent);
      }
    } catch (error) {
      console.error('Error saving to Drive:', error);
      throw error;
    }
  }

  // Load workspaces from Google Drive
  async loadFromDrive(): Promise<Workspace[]> {
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `name = '${FILE_NAME}' and trashed = false`,
        fields: 'files(id, name)',
      });

      const files = response.result.files;
      if (files && files.length > 0) {
        const fileId = files[0].id;
        const fileResponse = await window.gapi.client.drive.files.get({
          fileId: fileId,
          alt: 'media',
        });
        return fileResponse.result as Workspace[];
      }
      return [];
    } catch (error) {
      console.error('Error loading from Drive:', error);
      throw error;
    }
  }

  // Helper to create file (multipart)
  private async createFile(metadata: any, content: string) {
    const accessToken = window.gapi.client.getToken().access_token;
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));

    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
      body: form,
    });
  }

  // Helper to update file (multipart)
  private async updateFile(fileId: string, content: string) {
    const accessToken = window.gapi.client.getToken().access_token;
    
    // Simple upload for update often requires purely the media if metadata isn't changing, 
    // but multipart is safer for robust updates.
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: new Headers({ 
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        }),
      body: content,
    });
  }
}

export const driveService = new DriveService();
