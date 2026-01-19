import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

function AppLayout({ children, showGreeting = false, greetingContent = null }) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="app-container" style={{ display: "flex" }}>
      {/* Sidebar */}
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      {/* Main Page Content */}
      <div className="main-content" style={{ flex: 1 }}>
        <Header onToggleSidebar={toggleSidebar}>
          {showGreeting && greetingContent}
        </Header>

        {/* Page Content */}
        <div style={{ marginTop: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

export default AppLayout;
