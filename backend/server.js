import express from "express";
import despesaRoutes from "./routes/despesaRoutes.js";

const app= express();

app.use(express.json());

app.use("/api", despesaRoutes);





app.listen(3000, ()=>{
    console.log("Servidor rodando na porta 3000");
})