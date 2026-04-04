import React, { useState } from "react";
import { LoginForm } from "@/pages/auth/LoginForm";
import { MainApp } from "./MainApp";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState("barangay");
  const [userRole, setUserRole] = useState("admin");

  const handleLogin = (type, role) => {
    setUserType(type);
    setUserRole(role);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <MainApp userType={userType} role={userRole} onLogout={handleLogout} />
  );
};

export default Index;
