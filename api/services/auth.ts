// src/auth.ts
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SECRET = process.env.SECRET as string;
const EXPIRATION_TIME = '6h'; // ou '3600s' ou '7d'

export function gerarToken(userId: string): string {
  return jwt.sign(
    {
      sub: userId, // equivalente ao withSubject
    },
    SECRET,
    {
      issuer: 'Api-Gpi',
      expiresIn: EXPIRATION_TIME,
    }
  );
}

//Esse sub é o id do cliente
export function verificarToken(token: string): { sub: string } {
  try {
    const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;
    return { sub: decoded.sub as string };
  } catch (err) {
    throw new Error('Token inválido ou expirado');
  }
}
