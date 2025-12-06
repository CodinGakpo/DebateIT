import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";   // <-- ADD THIS

export default function Dashboard() {
  const { getToken } = useKindeAuth();
  const [data, setData] = useState(null);
  const navigate = useNavigate();                // <-- ADD THIS

  useEffect(() => {
    async function fetchData() {
      const token = await getToken();

      const res = await fetch("http://localhost:8000/api/protected/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      setData(json);
    }

    fetchData();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>

      {/* Button to go to Create/Join page */}
      <button onClick={() => navigate("/create-join")}>
        Create / Join Room
      </button>
    </div>
  );
}
