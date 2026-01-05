import React, { useState, useEffect } from 'react';
import { Cloud, Check, Loader2, RefreshCw, Settings, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { driveService } from '../services/driveService';
import { Workspace } from '../types';

interface DriveSyncProps {
  workspaces: Workspace[];
  onImport: (workspaces: Workspace[]) => void;
}

export const DriveSync: React.FC<DriveSyncProps> = ({ workspaces, onImport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [clientId, setClientId] = useState(() => localStorage.getItem('google_client_id') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-init if client ID exists
  useEffect(() => {
    if (clientId && window.google) {
       // We can try to init silently or wait for user action. 
       // For safety, let's wait for user to click "Connect" again or just show connected state if token is valid?
       // Actually, we need to re-init the service on load.
       handleInit(clientId, true);
    }
  }, []);

  const handleInit = async (id: string, silent = false) => {
    try {
      await driveService.init(id);
      setIsConnected(true);
      if (!silent) setStatus('idle');
    } catch (e) {
      console.error(e);
      if (!silent) {
        setStatus('error');
        setErrorMsg('Could not initialize Google API.');
      }
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim()) return;
    setStatus('syncing');
    localStorage.setItem('google_client_id', clientId);
    await handleInit(clientId);
    try {
        await driveService.signIn();
        setStatus('success');
        setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
        setStatus('error');
        setErrorMsg('Authentication failed.');
    }
  };

  const handleSyncPush = async () => {
    setStatus('syncing');
    try {
      await driveService.signIn(); // Ensure valid token
      await driveService.saveToDrive(workspaces);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg('Failed to save to Drive.');
    }
  };

  const handleSyncPull = async () => {
    if (!confirm("This will overwrite your local workspaces with data from Google Drive. Are you sure?")) return;
    setStatus('syncing');
    try {
      await driveService.signIn(); // Ensure valid token
      const remoteData = await driveService.loadFromDrive();
      if (remoteData && remoteData.length > 0) {
          onImport(remoteData);
          setStatus('success');
      } else {
          setErrorMsg('No data found on Drive.');
          setStatus('error');
      }
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg('Failed to load from Drive.');
    }
  };

  const handleDisconnect = () => {
      setClientId('');
      localStorage.removeItem('google_client_id');
      setIsConnected(false);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors mt-1"
      >
        <Cloud className={`w-4 h-4 ${isConnected ? 'text-green-400' : ''}`} />
        <span>Cloud Sync</span>
        {isConnected && <Check className="w-3 h-3 text-green-400 ml-auto" />}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="bg-blue-100 p-2 rounded-lg">
                <Cloud className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-bold">Google Drive Sync</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
             Close
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!isConnected ? (
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg flex gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p>To sync with your personal Drive, you need a <strong>Google Cloud Client ID</strong>. This connects the app to your account securely.</p>
              </div>
              
              <form onSubmit={handleConnect} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Google Client ID</label>
                  <input 
                    type="text" 
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="7284...apps.googleusercontent.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Found in Google Cloud Console > APIs & Services > Credentials</p>
                </div>
                <Button type="submit" className="w-full" isLoading={status === 'syncing'}>
                  Connect Drive
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
               <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-100">
                  <span className="flex items-center gap-2 text-sm text-green-800 font-medium">
                      <Check className="w-4 h-4" /> Drive Connected
                  </span>
                  <button onClick={handleDisconnect} className="text-xs text-red-500 hover:underline">Disconnect</button>
               </div>

               <div className="grid grid-cols-2 gap-3">
                   <button 
                        onClick={handleSyncPush}
                        disabled={status === 'syncing'}
                        className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all group"
                   >
                       <UploadIcon className="w-6 h-6 text-slate-400 group-hover:text-blue-600 mb-2" />
                       <span className="text-sm font-medium text-slate-700">Backup to Drive</span>
                       <span className="text-xs text-slate-400">Save local data to cloud</span>
                   </button>

                   <button 
                        onClick={handleSyncPull}
                        disabled={status === 'syncing'}
                        className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all group"
                   >
                       <DownloadIcon className="w-6 h-6 text-slate-400 group-hover:text-blue-600 mb-2" />
                       <span className="text-sm font-medium text-slate-700">Restore from Drive</span>
                       <span className="text-xs text-slate-400">Overwrite local with cloud</span>
                   </button>
               </div>

               {status === 'success' && (
                   <div className="text-center text-sm text-green-600 animate-fade-in font-medium">
                       Success!
                   </div>
               )}
               {status === 'error' && (
                   <div className="text-center text-sm text-red-600 animate-fade-in">
                       {errorMsg || 'An error occurred'}
                   </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const UploadIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);
