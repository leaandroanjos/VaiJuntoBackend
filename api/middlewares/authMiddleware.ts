// authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { verificarToken } from '../services/auth';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ erro: 'Token não fornecido.', valid: false });
        return;
    }

    const token = authHeader.split(' ')[1];
    
    try {
        const payload = await verificarToken(token);
        const user_id = payload.sub;

        if (!user_id) {
            res.status(403).json({ erro: 'Não autorizado.', valid: false });
            return;
        }

        // Adiciona o user_id à requisição para uso posterior
        (req as any).user = { id: user_id };
        next();
    } catch (err) {
        res.status(403).json({ erro: 'Não autorizado.' });
        return;
    }
};