import axios from "axios";
import { jwtDecode } from "jwt-decode"; // ✅ Use named export

// ✅ API Base URL
const AUTH_API_URL = "http://localhost:5137/api/auth";
const API_URL = "http://localhost:5137/api";

// ✅ Register User
export const register = async (username, password) => {
    try {
        const response = await axios.post(`${AUTH_API_URL}/register`, {
            username,
            passwordHash: password,
        });
        return response.data;
    } catch (error) {
        console.error("❌ Registration failed:", error.response?.data?.error);
        return { error: error.response?.data?.error || "Registration failed" };
    }
};

// ✅ Login User & Store Token in sessionStorage
export const login = async (username, password) => {
    try {
        const response = await axios.post(`${AUTH_API_URL}/login`, {
            username,
            passwordHash: password,
        });

        if (response.data.token) {
            sessionStorage.setItem("token", response.data.token); // ✅ Use sessionStorage
            console.log("✅ Token stored:", response.data.token);
        }

        return response.data;
    } catch (error) {
        console.error("❌ Login failed:", error.response?.data?.error);
        return { error: error.response?.data?.error || "Login failed" };
    }
};

// ✅ Get Token from sessionStorage
export const getToken = () => {
    const token = sessionStorage.getItem("token") || null; // ✅ Use sessionStorage
    console.log("🔍 Retrieved Token:", token); // ✅ Debug token retrieval
    return token;
};

// ✅ Logout User
export const logout = () => {
    sessionStorage.removeItem("token"); // ✅ Use sessionStorage
    console.log("👋 User logged out. Token removed.");
};

// ✅ Get User ID from JWT Token
export const getUserId = () => {
    const token = getToken();
    if (!token) {
        console.warn("⚠️ No token found. User is not logged in.");
        return null;
    }

    try {
        const decoded = jwtDecode(token);
        console.log("🔍 Decoded Token:", decoded); // ✅ Debugging: Check token structure
        const userId = decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || decoded.nameid || decoded.sub;
        console.log("🔍 Retrieved UserId:", userId); // ✅ Debug user ID
        return userId;
    } catch (error) {
        console.error("❌ Error decoding JWT:", error);
        return null;
    }
};

// ✅ Get All Users (Except the Logged-In User)
export const getUsers = async () => {
    try {
        const response = await axios.get(`${API_URL}/users`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching users:", error);
        return [];
    }
};