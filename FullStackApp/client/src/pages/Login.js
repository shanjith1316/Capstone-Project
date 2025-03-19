import React, { useState } from "react";
import { login } from "../services/authService";
import { useNavigate, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        const response = await login(username, password);

        if (response.token) {
            navigate("/chat");
        } else {
            setError(response.error);
        }
    };

    return (
        <div className="container mt-5">
            <div className="card mx-auto p-4 shadow" style={{ maxWidth: "400px" }}>
                <h3 className="text-center">🔑 Login</h3>
                {error && <p className="text-danger">{error}</p>}
                <form onSubmit={handleLogin}>
                    <input type="text" className="form-control mb-3" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    <input type="password" className="form-control mb-3" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="submit" className="btn btn-primary w-100">Login</button>
                </form>
                <p className="text-center mt-3">Don't have an account? <Link to="/register">Register</Link></p>
            </div>
        </div>
    );
};

export default Login;
