import { useKindeAuth } from "@kinde-oss/kinde-auth-react";

export default function Navbar() {
  const { login, logout, user, isLoading, isAuthenticated } = useKindeAuth();

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.given_name}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={login}>Login</button>
      )}
    </div>
  );
}
