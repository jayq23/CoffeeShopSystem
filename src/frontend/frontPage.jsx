import { useNavigate } from "react-router-dom";
import '../styles/frontpage.css';
import logo from '../assets/logo.jpg';

function FrontPage() {
    const navigate = useNavigate();

    const handleNavigation = (path) => {
        const container = document.querySelector('.secons-container');
        if (container) {
            container.classList.add('fade-out');
            setTimeout(() => {
                navigate(path);
            }, 400);
        } else {
            navigate(path);
        }
    };

    const handleLogin = () => {
        handleNavigation("/login");
    }

    return (
        <>
        <div className="secons-container">
            <div className="front-page">
                <h1 className="ints">Neutral Grounds</h1>
                {/*-<p className="descp">Coffee to feels peace everyday!</p>*/}
                <div className="descp"> 
                <span>C</span>
                <span>o</span>
                <span>f</span>
                <span>f</span>
                <span>e</span>
                <span>e</span>
                <span> </span>
                <span>t</span>
                <span>o</span>
                <span> </span>
                <span>f</span>
                <span>e</span>
                <span>e</span>
                <span>l</span>
                <span></span>
                <span> </span>
                <span>p</span>
                <span>e</span>
                <span>a</span>
                <span>c</span>
                <span>e</span>
                <span> </span>
                <span>e</span>
                <span>v</span>
                <span>e</span>
                <span>r</span>
                <span>y</span>
                <span>d</span>
                <span>a</span>
                <span>y</span>
                <span>!</span>
                </div>
            </div>
            <div className="setupLogo">
                <img src={logo} alt="Store Logo" className="logo" />
            <div className="choice">
                <h1 className="formText">☕️</h1>
                <button className="sign-in" onClick={handleLogin}>Login</button>

            </div>
            </div>
        </div>
        </>
    );
}

export default FrontPage;
