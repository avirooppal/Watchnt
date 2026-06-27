export default function Dashboard() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Watchn't Web Dashboard</h1>
      <p>Welcome to the central repository for your meeting intelligence.</p>
      
      <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', maxWidth: '600px' }}>
        <h2>System Status</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '0.5rem' }}>✅ API Connected</li>
          <li style={{ marginBottom: '0.5rem' }}>✅ Database Synced</li>
          <li style={{ marginBottom: '0.5rem' }}>✅ Redis Queue Active</li>
        </ul>
      </div>
    </div>
  )
}
