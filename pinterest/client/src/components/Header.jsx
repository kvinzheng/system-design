import React from "react";

export default function Header() {
  return (
    <header className="header">
      <div className="header__logo">
        <span className="header__logo-mark">P</span>
        <span className="header__logo-text">Pinterest</span>
      </div>
      <nav className="header__nav">
        <button className="header__nav-btn header__nav-btn--active">Home</button>
        <button className="header__nav-btn">Explore</button>
        <button className="header__nav-btn">Create</button>
      </nav>
      <div className="header__search">
        <input type="text" placeholder="Search" aria-label="Search" />
      </div>
      <div className="header__avatar" aria-label="Profile">A</div>
    </header>
  );
}
