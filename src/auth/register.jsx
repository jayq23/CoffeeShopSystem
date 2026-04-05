import { useNavigate } from "react-router-dom";
import '../styles/register.css';

const API_BASE_URL = "http://localhost:5000";

function Register() {
    const navigate = useNavigate();

    const handleNavigation = (path) => {
        const container = document.querySelector('.bodyRegister');
        if (container) {
            container.classList.add('fade-out');
            setTimeout(() => {
                navigate(path);
            }, 400);
        } else {
            navigate(path);
        }
    };

    const handleRegister = async () => {
        const fullName = document.querySelector('.fullNameInput').value;
        const username = document.querySelector('.userInput').value.trim().toLowerCase();
        const password = document.querySelector('.passInput').value;
        const confirmPassword = document.querySelector('.confirmPassInput').value;
        const email = document.querySelector('.emailInput').value;
        const number = document.querySelector('.numberInput').value;

        // Validation
        if (!fullName || !username || !password || !confirmPassword || !email || !number) {
            alert("Please fill in all fields");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        const userData = {
            name: fullName,
            username,
            password,
            email,
            number
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data?.message || 'Registration failed. Please try again.');
                return;
            }

            alert("Registration successful! You can now log in.");
            handleNavigation("/login");
        } catch (error) {
            console.error('Registration error:', error);
            alert('Cannot connect to server. Please make sure backend is running.');
        }
    };

    return (
        <div className="bodyRegister">
            <button onClick={() => handleNavigation("/admin")} className="backButton">Back</button>
         <div className="registerContainer">
            <h1>Register</h1>
                <label>Full Name: </label>
                <input type="text" name="fullName" className="fullNameInput" placeholder="Full Name" required/>
            <label>Username: </label>
            <input type="text" name="username" className="userInput" placeholder="Username" required/>
            <label>Password: </label>
            <input type="password" name="password" className="passInput" placeholder="Password" required />
            <label>Confirm Password: </label>
            <input type="password" name="confirmPassword" className="confirmPassInput" placeholder="Confirm Password" required />
            <label>Email: </label>
            <input type="email" name="email" className="emailInput" placeholder="Email" required />
            <label>Number: </label>
            <input type="tel" name="number" className="numberInput" placeholder="Phone Number" required/>
                <button className="buttonRegister" onClick={handleRegister}>
                    Register
                </button>
        </div>
    </div>
    );
}

export default Register;
