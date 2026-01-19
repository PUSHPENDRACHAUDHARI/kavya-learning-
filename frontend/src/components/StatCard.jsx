import React from "react";
// import "./StatCard.css";

function StatCard({ title, value, color1, color2, IconComponent }) {
  return (
    <div
      className="stat-card-dash"
      style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}
    >
      <div className="stat-content">
        <p style={{ fontSize: "16px" , color:'white' , marginBottom:'10px'}}>{title}</p>
        <h3 style={{ fontSize: "24px", color: "white" }}>{value}</h3>
      </div>
      <div>
        {IconComponent && <IconComponent size="2.8em" color="#becad6ff" />}
      </div>
    </div>
  );
}

export default StatCard;
