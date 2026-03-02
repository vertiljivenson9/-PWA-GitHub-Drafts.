import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface AuthCallbackProps {
  onSuccess: () => void;
  onError: () => void;
}

export function AuthCallback({ onSuccess, onError }: AuthCallbackProps) {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Completing sign in...');
  
  const { handleCallback } = useAuth();

  useEffect(() => {
    const processCallback = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      
      if (!code) {
        setStatus('error');
        setMessage('Invalid authentication response');
        setTimeout(onError, 2000);
        return;
      }

      try {
        const success = await handleCallback(code);
        
        if (success) {
          setStatus('success');
          setMessage('Successfully signed in!');
          setTimeout(onSuccess, 1500);
        } else {
          setStatus('error');
          setMessage('Authentication failed');
          setTimeout(onError, 2000);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('Authentication failed');
        setTimeout(onError, 2000);
      }
    };

    processCallback();
  }, [handleCallback, onSuccess, onError]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-canvas p-6">
      <div className="text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="w-16 h-16 text-accent-fg animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-default mb-2">Signing In</h2>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-success-fg mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-default mb-2">Success!</h2>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-danger-fg mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-default mb-2">Error</h2>
          </>
        )}
        
        <p className="text-muted">{message}</p>
      </div>
    </div>
  );
}
