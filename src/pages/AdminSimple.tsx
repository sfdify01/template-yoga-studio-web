/**
 * Minimal admin page for testing
 * This has no dependencies and should always render
 */

export const AdminSimple = () => {
  console.log('AdminSimple rendering...');
  
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '16px',
          color: '#111827'
        }}>
          Admin Page Test
        </h1>
        
        <div style={{
          backgroundColor: '#10b981',
          color: 'white',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          ✅ If you can see this, the admin route is working!
        </div>
        
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <strong>Next Steps:</strong>
          <ol style={{ marginTop: '12px', paddingLeft: '20px' }}>
            <li>Open browser console (F12)</li>
            <li>Check for any JavaScript errors</li>
            <li>If no errors, the full Admin component has an issue</li>
            <li>If there ARE errors, that's the problem to fix</li>
          </ol>
        </div>
        
        <div style={{
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <strong>Console Log:</strong>
          <pre style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: '#1f2937',
            color: '#10b981',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px'
          }}>
{`// Should see this in console:
"AdminSimple rendering..."`}
          </pre>
        </div>
        
        <div style={{ marginTop: '24px' }}>
          <a
            href="/admin-health"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#8B0000',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              marginRight: '12px'
            }}
          >
            Run Health Check
          </a>
          
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#6b7280',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px'
            }}
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
};
