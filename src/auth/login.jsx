import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import '../styles/login.css';

const API_BASE_URL = "http://localhost:5000";

function Login() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState('user');

    useEffect(() => {
        // Clear legacy account storage after moving auth to backend.
        localStorage.removeItem('registeredUser');
        localStorage.removeItem('registeredUsers');
    }, []);

    const handleNavigation = (path) => {
        const container = document.querySelector('.bodyLogin');
        if (container) {
            container.classList.add('fade-out');
            setTimeout(() => {
                navigate(path);
            }, 400);
        } else {
            navigate(path);
        }
    };

    const handleLogin = async () => {
        const selectedRole = role;
        const user = username.trim().toLowerCase();
        const pass = password;

        if (!selectedRole) {
            alert("Please select a user type.");
            return;
        }

        if (!user || !pass) {
            alert("Please enter username and password.");
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: user, password: pass, role: selectedRole }),
            });
            const data = await response.json();

            if (!response.ok) {
                alert(data?.message || 'Login failed. Please try again.');
                return;
            }

            localStorage.setItem("isAuth", "true"); 
            localStorage.setItem("userRole", selectedRole);
            localStorage.setItem("currentUser", data?.user?.username || user);

            if (selectedRole === "admin") {
                handleNavigation("/admin");
                console.log("Entering admin dashboard");
            } else if (selectedRole === "user") {
                handleNavigation("/staffDashboard");
                console.log("Entering cashier dashboard");
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Cannot connect to server. Please make sure backend is running.');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    }
    const handleBack = () => {
        handleNavigation("/frontPage"); 
    }
    return (
        <>
        <div className="bodyLogin">
        <button className="BackButton" onClick={handleBack}>Back</button>
        <div className="loginContainer">
            <p className="myh1">Login</p>

            <select className="optionsRole" 
            name="role" 
            required value={role} 
            onChange={e => setRole(e.target.value)}>
                <option value="user">Employee</option>
                <option value="admin">Admin</option>
            </select>

            <label className="userLog">Username</label>
            <input type="text"
            name="username"
            placeholder="Enter username" 
            className="username-input" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            onKeyDown={handleKeyDown} />

            <label className="passLog">Password</label>
            <input type={showPassword ? "text" : "password"} 
            value={password} name="password" 
            placeholder="Enter password" 
            className="password-input" 
            onChange={e => setPassword(e.target.value)} 
            onKeyDown={handleKeyDown} />

            <div className="showPassword">
                <label className="showPassLabel">
                    <input type="checkbox" 
                    checked={showPassword} 
                    onChange={e => setShowPassword(e.target.checked)} /> show password
                </label>
            </div>

            <div className="buttonsLogin">
                <button className="btnLogin" onClick={handleLogin}>Login</button>
            </div>
        </div>
        </div>
        </>
    );
}

export default Login;
