import pool from '../config/db.js';
import CriarDespesaDTO from '../models/DTOs/categoriaDTO.js';

class DespesasInfraStructure {

    async criarDespesa(criarDespesaDTO) {

        const query = `
            INSERT INTO despesas 
            (descricao, tipo_despesa, periodicidade, datas, valor, id_usuario, id_categoria)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `;

        const values = [
            criarDespesaDTO.descricao,
            criarDespesaDTO.tipoDespesa,
            criarDespesaDTO.periodicidade,
            criarDespesaDTO.datas,
            criarDespesaDTO.valor,
            criarDespesaDTO.idUsuario,
            criarDespesaDTO.idCategoria
        ];

        const connection = await pool.getConnection();

        try {
            const [result] = await connection.query(query, values);

            return result;

        } catch (error) {
            console.error('Erro ao criar despesa:', error);
            throw error;

        } finally {
            connection.release();
        }
    }
}

try {
    const despesasInfraStructure = new DespesasInfraStructure();

    const despesaDTO = new CriarDespesaDTO(
        'Aluguel',
        'Fixa',
        'Mensal',
        '2024-06-01',
        1500.00,
        1,
        2
    );

    const response = await despesasInfraStructure.criarDespesa(despesaDTO);

    console.log(response);

} catch (erro) {
    console.log(erro, "Erro ao tentar criar despesa");
}
