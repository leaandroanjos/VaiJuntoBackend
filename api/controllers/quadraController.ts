import { Router } from 'express';
import { buscarEndereco, getCoordenadas } from '../services/cep';
import { authenticateToken } from '../middlewares/authMiddleware';
import multer from 'multer';
import { avaliarQuadra, buscarQuadrasProximas, cadastrarQuadra } from '../dao/quadraDao';
import path from 'path';

const storage = multer.diskStorage({
    destination: 'uploads/', // pasta onde os arquivos serão salvos
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);
        const filename = `${Date.now()}${extension}`;
        cb(null, filename);
    }
});

const upload = multer({ storage });
const router = Router();

router.post('/quadras', upload.single('photo'), authenticateToken, async (req, res) => {
    try {
        const { nome, cep } = req.body;
        const photoPath = req.file?.path || '';
        const endereco = await buscarEndereco(cep);
        const geoLoc = await getCoordenadas(endereco);
        if (geoLoc) {
            const id_quadra = cadastrarQuadra(nome, cep, geoLoc?.latitude, geoLoc?.longitude, photoPath)
            res.status(201).json({ message: "Quadra cadastrada com sucesso!" });
            return;
        } else {
            throw new Error("Erro na obtenção das coordenadas");
        }
    } catch {
        res.status(500).json({ erro: "Erro interno" });
        return;
    }
});

router.get('/quadras', authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const results = await buscarQuadrasProximas(userId);
        res.status(200).json(results);
        return;
    } catch(err) {
        console.log(err);
        res.status(500).json({ erro: "Erro interno" });
        return;
    }
});

router.post('/quadras/:id/avaliar', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { rating } = req.body;

    try {
        const quadraRating = await avaliarQuadra(id, rating);
        res.status(200).json({message: "Avaliação enviada!",newRating: quadraRating});
        return;
    } catch(err) {
        console.log(err);
        res.status(500).json({ erro: "Erro interno" });
        return;
    }
});

export default router;