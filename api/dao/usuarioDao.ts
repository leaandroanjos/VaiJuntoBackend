// main.ts
import bcrypt from 'bcrypt';
import { pool } from '../db/db';
import { buscarEndereco, getCoordenadas } from '../services/cep';

type User = {
  id: number,
  email: string,
  nome_completo: string,
  nome_usuario: string,
  senha_hash: string,
  cep: string
}

export async function getAll() {
  const result = await pool.query(`
        SELECT 
          nome,
          email
        FROM tb_users
        ORDER BY nome ASC
      `);

  if (!result || result.rowCount === 0) {
    throw new Error("Não foi possível entrar os usuários");
  }

  return result.rows;
}

export async function consultarUserPorEmail(email: string, usuario: string): Promise<User | null> {
  const query = `
      SELECT * FROM tb_users WHERE nome_usuario = $1 OR email = $2
    `;
  const values = [usuario, email];
  const result = await pool.query(query, values);

  if (result.rowCount == 0) {
    return null;
  }

  return result.rows[0];
}

export async function cadastrarUsuario(
  nome_completo: string,
  usuario: string,
  email: string,
  cep: string,
  hash: string,
  latitude: number,
  longitude: number
): Promise<number> {
  const result = await pool.query(
    `INSERT INTO tb_users (nome_completo, nome_usuario, email, cep, senha_hash, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
    [nome_completo, usuario, email, cep, hash, latitude, longitude]
  );

  if (result.rowCount === 0) {
    throw new Error("Não foi possível cadastrar o usuário");
  }

  return result.rows[0].id; // { id: number }
}

export async function putUser(campo: string, novo_valor: string, email: string) {
  // Atualização padrão
  let query = `UPDATE tb_users SET ${campo} = $1 WHERE email = $2`;
  let values: any[] = [novo_valor, email];

  // Se o campo for cep, atualizar também latitude e longitude
  if (campo === 'cep') {
    const endereco = await buscarEndereco(novo_valor);
    const geoLoc = await getCoordenadas(endereco);

    if (!geoLoc) {
      throw new Error('Erro na obtenção das coordenadas')
    }

    query = `
                UPDATE tb_users
                SET cep = $1, latitude = $2, longitude = $3
                WHERE email = $4
            `;
    values = [novo_valor, geoLoc.latitude, geoLoc.longitude, email];
  }
  const result = await pool.query(query, values);
  if (result.rowCount === 0) {
    throw new Error('Usuário não encontrado.');
  }
}

export async function gerarHash(senha: string): Promise<string> {
  const saltRounds = 10; // mesmo padrão do Java
  const hash = await bcrypt.hash(senha, saltRounds);
  return hash;
}

export async function compararSenhas(senha: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(senha, hash);
}
