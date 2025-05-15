import { pool } from '../db/db';

export async function cadastrarQuadra(
    nome: string,
    cep: string,
    lat: number,
    lon: number,
    photoUrl: string
): Promise<number> {
    const result = await pool.query(
        `INSERT INTO tb_quadra (nome, cep, photo, latitude, longitude, rating, rating_qtd)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
        [nome, cep, photoUrl, lat, lon, 0, 0]
    );

    if (result.rowCount === 0) {
        throw new Error("Não foi possível cadastrar o usuário");
    }

    return result.rows[0].id; // { id: number }
}

export async function buscarQuadrasProximas(
    usuarioId: number,
    limite: number = 20
): Promise<
    {
        id: number,
        nome: string;
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
    FROM tb_quadra q
    JOIN tb_users u ON u.id = $1
    ORDER BY distancia_km ASC
    LIMIT $2
    `,
        [usuarioId, limite]
    );

    return result.rows;
}

export async function avaliarQuadra(id: string, novoRating: number) {
    // Passo 1: Obter o rating e a quantidade de avaliações atuais
    const result = await pool.query(
        `SELECT rating, rating_qtd FROM tb_quadra WHERE id = $1`,
        [id]
    );

    if (result.rowCount === 0) {
        throw new Error("Quadra não encontrada");
    }

    const { rating, rating_qtd } = result.rows[0];

    // Passo 2: Calcular o novo rating
    const novoRatingCalculado = (rating * rating_qtd + novoRating) / (rating_qtd + 1);

    // Passo 3: Atualizar o rating e a quantidade de avaliações na tabela
    const updateResult = await pool.query(
        `UPDATE tb_quadra
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
