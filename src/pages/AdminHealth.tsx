import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { edgeFunctionBaseUrl } from '../lib/supabase-edge';

const BASE_URL = edgeFunctionBaseUrl;

interface HealthCheck {
  name: string;
  status: 'checking' | 'success' | 'error';
  message: string;
  details?: any;
}

export const AdminHealth = () => {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    runHealthChecks();
  }, []);

  const runHealthChecks = async () => {
    setTesting(true);
    const results: HealthCheck[] = [];

    // Check 1: Server is reachable
    results.push({ name: 'Server Reachable', status: 'checking', message: 'Testing...' });
    setChecks([...results]);

    try {
      const healthResponse = await fetch(`${BASE_URL}/health`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'apikey': publicAnonKey }
      });
      
      if (healthResponse.ok) {
        const data = await healthResponse.json();
        results[0] = {
          name: 'Server Reachable',
          status: 'success',
          message: `Server is up and running`,
          details: data
        };
      } else {
        results[0] = {
          name: 'Server Reachable',
          status: 'error',
          message: `Server returned ${healthResponse.status}`,
          details: { status: healthResponse.status, statusText: healthResponse.statusText }
        };
      }
    } catch (error: any) {
      results[0] = {
        name: 'Server Reachable',
        status: 'error',
        message: 'Cannot reach server',
        details: { error: error.message }
      };
    }
    setChecks([...results]);

    // Check 2: Public blog posts endpoint
    results.push({ name: 'Public Blog API', status: 'checking', message: 'Testing...' });
    setChecks([...results]);

    try {
      const blogResponse = await fetch(`${BASE_URL}/blog/posts`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'apikey': publicAnonKey }
      });
      
      if (blogResponse.ok) {
        const data = await blogResponse.json();
        results[1] = {
          name: 'Public Blog API',
          status: 'success',
          message: `Found ${data.posts?.length || 0} posts`,
          details: data
        };
      } else {
        results[1] = {
          name: 'Public Blog API',
          status: 'error',
          message: `Failed with status ${blogResponse.status}`,
          details: await blogResponse.text()
        };
      }
    } catch (error: any) {
      results[1] = {
        name: 'Public Blog API',
        status: 'error',
        message: 'Request failed',
        details: { error: error.message }
      };
    }
    setChecks([...results]);

    // Check 3: Admin login endpoint
    results.push({ name: 'Admin Login Endpoint', status: 'checking', message: 'Testing...' });
    setChecks([...results]);

    try {
      const loginResponse = await fetch(`${BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'apikey': publicAnonKey,
        },
        credentials: 'include',
        body: JSON.stringify({ password: 'test' })
      });
      
      // We expect 401 for wrong password, which means endpoint is working
      if (loginResponse.status === 401) {
        results[2] = {
          name: 'Admin Login Endpoint',
          status: 'success',
          message: 'Endpoint is working (rejected test password)',
          details: { status: loginResponse.status }
        };
      } else if (loginResponse.ok) {
        results[2] = {
          name: 'Admin Login Endpoint',
          status: 'success',
          message: 'Endpoint is working',
          details: { status: loginResponse.status }
        };
      } else {
        results[2] = {
          name: 'Admin Login Endpoint',
          status: 'error',
          message: `Unexpected status ${loginResponse.status}`,
          details: await loginResponse.text()
        };
      }
    } catch (error: any) {
      results[2] = {
        name: 'Admin Login Endpoint',
        status: 'error',
        message: 'Request failed',
        details: { error: error.message }
      };
    }
    setChecks([...results]);

    // Check 4: Admin check endpoint (without auth)
    results.push({ name: 'Admin Auth Check', status: 'checking', message: 'Testing...' });
    setChecks([...results]);

    try {
      const authResponse = await fetch(`${BASE_URL}/admin/check`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'apikey': publicAnonKey },
        credentials: 'include'
      });
      
      if (authResponse.status === 401) {
        results[3] = {
          name: 'Admin Auth Check',
          status: 'success',
          message: 'Endpoint working (not authenticated)',
          details: await authResponse.json()
        };
      } else if (authResponse.ok) {
        const data = await authResponse.json();
        results[3] = {
          name: 'Admin Auth Check',
          status: 'success',
          message: data.authenticated ? 'Authenticated!' : 'Not authenticated',
          details: data
        };
      } else {
        results[3] = {
          name: 'Admin Auth Check',
          status: 'error',
          message: `Failed with status ${authResponse.status}`,
          details: await authResponse.text()
        };
      }
    } catch (error: any) {
      results[3] = {
        name: 'Admin Auth Check',
        status: 'error',
        message: 'Request failed',
        details: { error: error.message }
      };
    }
    setChecks([...results]);

    setTesting(false);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'checking') return <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />;
    if (status === 'success') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const overallStatus = checks.every(c => c.status === 'success') ? 'success' : 
                        checks.some(c => c.status === 'error') ? 'error' : 'checking';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl mb-2">Admin System Health Check</h1>
              <p className="text-gray-600">
                Diagnostic tool for the blog admin system
              </p>
            </div>
            <Button
              onClick={runHealthChecks}
              disabled={testing}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
              Retest
            </Button>
          </div>

          {/* Overall Status */}
          {checks.length > 0 && (
            <div className={`p-4 rounded-lg mb-6 ${
              overallStatus === 'success' ? 'bg-green-50 border border-green-200' :
              overallStatus === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center gap-3">
                {overallStatus === 'checking' && <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />}
                {overallStatus === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                {overallStatus === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                <div>
                  <h3 className={`font-medium ${
                    overallStatus === 'success' ? 'text-green-900' :
                    overallStatus === 'error' ? 'text-red-900' :
                    'text-blue-900'
                  }`}>
                    {overallStatus === 'success' && '✅ All Systems Operational'}
                    {overallStatus === 'error' && '❌ Some Issues Detected'}
                    {overallStatus === 'checking' && '🔄 Running Tests...'}
                  </h3>
                  <p className={`text-sm ${
                    overallStatus === 'success' ? 'text-green-700' :
                    overallStatus === 'error' ? 'text-red-700' :
                    'text-blue-700'
                  }`}>
                    {overallStatus === 'success' && 'Admin system is working correctly'}
                    {overallStatus === 'error' && 'Check the details below to diagnose issues'}
                    {overallStatus === 'checking' && 'Please wait...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Individual Checks */}
          <div className="space-y-4">
            {checks.map((check, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 flex-1">
                    <StatusIcon status={check.status} />
                    <div className="flex-1">
                      <h3 className="font-medium">{check.name}</h3>
                      <p className={`text-sm ${
                        check.status === 'success' ? 'text-green-600' :
                        check.status === 'error' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {check.message}
                      </p>
                    </div>
                  </div>
                  <Badge variant={
                    check.status === 'success' ? 'default' :
                    check.status === 'error' ? 'destructive' :
                    'secondary'
                  }>
                    {check.status}
                  </Badge>
                </div>
                {check.details && (
                  <details className="mt-3">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      View technical details
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
                      {JSON.stringify(check.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>

          {/* Help Section */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Need Help?</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• If server is unreachable: Deploy with <code className="bg-blue-100 px-1 rounded">supabase functions deploy server</code></li>
              <li>• If blog API fails: Check KV store has data at key 'blog_posts'</li>
              <li>• If admin endpoints fail: Verify server code is deployed correctly</li>
              <li>• If all tests pass: Try logging in at <a href="/admin" className="underline">/admin</a></li>
            </ul>
          </div>

          {/* Links */}
          <div className="mt-6 flex gap-4">
            <Button
              onClick={() => window.location.href = '/admin'}
              variant="default"
            >
              Go to Admin Login
            </Button>
            <Button
              onClick={() => window.location.href = '/admin-debug'}
              variant="outline"
            >
              Connection Debug Tool
            </Button>
            <Button
              onClick={() => window.open(`https://supabase.com/dashboard/project/${projectId}/functions`, '_blank')}
              variant="outline"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Supabase Dashboard
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
