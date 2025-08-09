import './Navbar.css'
import useTheme from './useTheme';

import dark from '../../public/dark.svg'
import light from '../../public/light.svg'

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <nav>
      <h1>MonoDither</h1>
      
      <div className="nav-right">
        <a href="https://github.com/Ariubilig/SpotifyAPI" target="_blank" rel="noopener noreferrer">Github</a>
        <span className="separator">|</span>
        
        <button onClick={toggleTheme} className="theme-toggle-btn">
          <img src={theme === 'dark' ? dark : light} alt="Toggle Theme" className="theme-icon" />
        </button>
      </div>
    </nav>
  )
}

export default Navbar