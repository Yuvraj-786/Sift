import "../styles/_navbar.scss";

function Navbar() {
    return (
       <nav className="home-nav">
        <div className="home-nav__logo">
          sift<span>.</span>
        </div>
        <div className="home-nav__links">
          <a className="home-nav__cta" href="#inputs">report</a>
          <a className="home-nav__cta" href="#interview-qa">interview Q&amp;A</a>
        </div>
      </nav>
    );
}

export default Navbar;