import pool from '../config/db.js';

// import CriarDespesaDTO from '../dto/criarDespesaDTO.js';

class DespesasInfrastructure {

    async criarDespesa(criarDespesaDTO) {

        const query = `
            INSERT INTO despesa 
            (
                descricao,
                tipo_despesa,
                periodicidade,
                datas,
                valor,
                id_usuario,
                id_categoria
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
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



// try{
//     const despesasInfrastructure = new DespesasInfrastructure();

   




//     despesasInfrastructure.criarDespesa({ 
            
//             descricao: 'Aluguel',
//             tipoDespesa: 'Fixa',
//             periodicidade: 'Mensal',
//             datas: '2024-06-01',
//             valor: 1500.00,
//             idUsuario: 1,
//             idCategoria: 1
        
//     }).then(result => {
//         console.log('Despesa criada com sucesso:', result);
//     }).catch(error => {
//         console.error('Erro ao criar despesa:', error);
//     });

// }catch(error){
//     console.log(error)
// }



export default new DespesasInfrastructure();