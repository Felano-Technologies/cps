import { useEffect, useState } from 'react';

// Define the shape of our expected API response
interface ApiResponse {
  message: string;
}

function App() {
  // Strongly type the state
  const [data, setData] = useState('');

  useEffect(() => {
    fetch('/api/hello')
      .then((res) => res.json())
      .then((data: ApiResponse) => setData(data.message))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h1>React + Node.js (TypeScript)</h1>
      <p>Backend says: {data || 'Loading...'}</p>
    </div>




  );
}

export default App;