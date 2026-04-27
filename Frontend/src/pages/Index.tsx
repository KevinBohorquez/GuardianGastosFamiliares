import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";

const Index = () => {
  const navigate = useNavigate();
  const { family } = useApp();
  useEffect(() => {
    navigate(family ? "/profiles" : "/login", { replace: true });
  }, [family, navigate]);
  return null;
};

export default Index;
