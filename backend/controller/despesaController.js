import despesaModels from "../infrastructure/despesaModels";
import express from "express";

import { CriarDespesaDTO } from "../models/DTOs/despesaDTO";

class DespesaController{


async criarDespesa(req, res) {

    try{

        const resposta= req.body;
        const despesa= new CriarDespesaDTO(
            resposta.descricao,
            resposta.tipoDespesa,
            resposta.periodicidade,
            resposta.datas,
            resposta.valor,
            resposta.idUsuario,
            resposta.idCategoria

        )

        const result= await despesaModels.criarDespesa(despesa);

        if(!result.affectedRows>0){
            throw new Error("Erro ao criar despesa")
        }
        res.status(201).json({message: "Despesa criada com sucesso", id: result.insertId});

    }
    catch(error){
        console.error('Erro ao criar despesa:', error);
        res.status(500).json({message: "Erro ao criar despesa", error: error.message});
    }


}


}


export default new DespesaController();