import { pool } from '../db/db';

export async function cadastrarEvento(
    nome: string,
    desc: string,
    data: string,
    cep: string,
    lat: number,
    lon: number,
    photoUrl: string
): Promise<number> {
    const result = await pool.query(
        `INSERT INTO tb_evento (nome,descricao,data_evento, cep, photo, latitude, longitude,inscritos, rating, rating_qtd)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
        [nome, desc, data, cep, photoUrl, lat, lon, 0, 0, 0]
    );

    if (result.rowCount === 0) {
        throw new Error("Não foi possível cadastrar o evento");
    }

    return result.rows[0].id; // { id: number }
}

export async function buscarEventosProximos(
    usuarioId: number,
    limite: number = 20
): Promise<
    {
        id: number,
        nome: string;
        inscritos: number;
        descricao: string;
        data: string;
        cep: string;
        photo: string;
        rating: number;
        distancia_km: number;
    }[]
> {
    const result = await pool.query(
        `
    SELECT 
      q.id,
      q.nome,
      q.descricao,
      q.inscritos,
      q.data_evento,
      q.cep,
      q.photo,
      q.rating,
      (
        6371 * acos(
          cos(radians(u.latitude)) *
          cos(radians(q.latitude)) *
          cos(radians(q.longitude) - radians(u.longitude)) +
          sin(radians(u.latitude)) *
          sin(radians(q.latitude))
        )
      ) AS distancia_km
    FROM tb_evento q
    JOIN tb_users u ON u.id = $1
    ORDER BY distancia_km ASC
    LIMIT $2
    `,
        [usuarioId, limite]
    );

    return result.rows;
}

export async function avaliarEvento(id: string, novoRating: number) {
    // Passo 1: Obter o rating e a quantidade de avaliações atuais
    const result = await pool.query(
        `SELECT rating, rating_qtd FROM tb_evento WHERE id = $1`,
        [id]
    );

    if (result.rowCount === 0) {
        throw new Error("Evento não encontrada");
    }

    const { rating, rating_qtd } = result.rows[0];

    // Passo 2: Calcular o novo rating
    const novoRatingCalculado = (rating * rating_qtd + novoRating) / (rating_qtd + 1);

    // Passo 3: Atualizar o rating e a quantidade de avaliações na tabela
    const updateResult = await pool.query(
        `UPDATE tb_evento
        SET rating = $1, rating_qtd = $2
        WHERE id = $3
        RETURNING *`,
        [novoRatingCalculado, rating_qtd + 1, id]
    );

    if (updateResult.rowCount === 0) {
        throw new Error("Erro ao atualizar a avaliação");
    }

    // Retorna o id da quadra atualizada ou qualquer outra informação que você precise
    return updateResult.rows[0].rating;
}

export async function inscreverUsuarioNoEvento(userId: number, eventoId: number): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Tenta inserir a inscrição
        const insertResult = await client.query(`
            INSERT INTO usuarios_eventos (id_usuario, id_evento)
            VALUES ($1, $2)
            ON CONFLICT (id_usuario, id_evento) DO NOTHING
            RETURNING *
        `, [userId, eventoId]);

        if (insertResult.rowCount) {
            // Se a inscrição foi feita (não existia antes), atualiza o contador de inscritos
            if (insertResult.rowCount > 0) {
                await client.query(`
                UPDATE tb_evento
                SET inscritos = inscritos + 1
                WHERE id = $1
            `, [eventoId]);
            }

            await client.query('COMMIT');
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao inscrever usuário no evento:', error);
        throw error;
    } finally {
        client.release();
    }
}

export async function getInscricoes(userId: string) {
    const { rows } = await pool.query(
        `SELECT e.id, e.nome, e.descricao, e.data_evento, e.cep, e.photo, e.rating, ue.data_inscricao
             FROM usuarios_eventos ue
             JOIN tb_evento e ON ue.id_evento = e.id
             WHERE ue.id_usuario = $1`, // Fazendo a consulta com o id do usuário
        [userId]
    );
    if (rows.length === 0) {
        throw new Error("Nenhuma inscrição encontrada");
    }
    else return rows;
}

export async function cancelarInscricao(userId: string, eventId: string) {
    try{
        await pool.query(
            'DELETE FROM usuarios_eventos WHERE id_usuario = $1 AND id_evento = $2',
            [userId, eventId]
        );
    } catch(err){
        throw new Error(`Erro no cancelamento de inscrição`);
    }
}