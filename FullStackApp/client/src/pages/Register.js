import React, { useState } from "react";
import { register } from "../services/authService";
import { useNavigate, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const Register = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        const response = await register(username, password);

        if (response.message) {
            navigate("/login");  // Redirect to login after successful registration
        } else {
            setError(response.error);
        }
    };

    return (
        <div className="container mt-5">
            <div className="card mx-auto p-4 shadow" style={{ maxWidth: "400px" }}>
                <h3 className="text-center">📝 Register</h3>
                {error && <p className="text-danger text-center">{error}</p>}
                <form onSubmit={handleRegister}>
                    <input type="text" className="form-control mb-3" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    <input type="password" className="form-control mb-3" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="submit" className="btn btn-success w-100">Register</button>
                </form>
                <p className="text-center mt-3">Already have an account? <Link to="/login">Login here</Link></p>
            </div>
        </div>
    );
};

export default Register;
