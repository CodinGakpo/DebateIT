import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const { login, isAuthenticated } = useKindeAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");   // auto skip landing
    }
  }, [isAuthenticated]);

  return (
    <div>
      <h1>Welcome</h1>
      {!isAuthenticated && <button onClick={login}>Login</button>}
    </div>
  );
}
