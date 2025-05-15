import { Router } from 'express';
import { buscarEndereco, getCoordenadas } from '../services/cep';
import { authenticateToken } from '../middlewares/authMiddleware';
import multer from 'multer';
import path from 'path';
import { avaliarEvento, buscarEventosProximos, cadastrarEvento, cancelarInscricao, getInscricoes, inscreverUsuarioNoEvento } from '../dao/eventosDao';

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

router.post('/eventos', upload.single('photo'), authenticateToken, async (req, res) => {
    try {
        const { nome, zipcode, desc, data } = req.body;
        console.log(req.body);
        const photoPath = req.file?.path || '';
        const dataFormatada = formatarData(data);

        const endereco = await buscarEndereco(zipcode);
        const geoLoc = await getCoordenadas(endereco);
        if (geoLoc) {
            const id_quadra = await cadastrarEvento(nome, desc, dataFormatada, zipcode, geoLoc.latitude, geoLoc.longitude, photoPath)
            res.status(201).json({ message: "Evento cadastrada com sucesso!" });
            return;
        } else {
            throw new Error("Erro na obtenção das coordenadas");
        }
    } catch(err) {
        console.log(err);
        res.status(500).json({ erro: "Erro interno" });
        return;
    }
});

router.get('/eventos', authenticateToken, async (req, res) => {
    try {
        const userId = await (req as any).user.id;
        const results = await buscarEventosProximos(userId);

        const updatedResults = results.map(result => {
            // Atualizando o caminho da foto
            result.photo = result.photo;
            return result;
        });
        res.status(200).json(updatedResults);
        return;
    } catch(err) {
        console.log(err);
        res.status(500).json({ erro: "Erro interno" });
        return;
    }
});

router.post('/eventos/:id/avaliar', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { rating } = req.body;

    try {
        const quadraRating = await avaliarEvento(id, rating);
        res.status(200).json({message: "Avaliação enviada!",newRating: quadraRating});
        return;
    } catch(err) {
        console.log(err);
        res.status(500).json({ erro: "Erro interno" });
        return;
    }
});

router.post('/eventos/:id/inscrever', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const userId = (req as any).user.id;

        await inscreverUsuarioNoEvento(userId, parseInt(id));
        console.log(`Usuário ${userId} inscrito no evento ${id}`);
        
        res.status(200).json({ message: "Inscrição realizada com sucesso!" });
        return;
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: "Erro interno ao tentar se inscrever no evento" });
        return;
    }
});

router.get('/minhas-inscricoes', authenticateToken, async (req: any, res) => {
    try {
        const userId = (req as any).user.id;
        const rows = await getInscricoes(userId);
        res.status(200).json(rows); // Retorna os eventos em que o usuário está inscrito
    } catch (err) {
        console.error('Erro ao buscar inscrições:', err);
        res.status(500).json({ error: 'Erro interno ao buscar inscrições' });
    }
});

router.delete('/cancelar-inscricao/:id_evento', authenticateToken, async (req, res) => {
    const { id_evento } = req.params;
    try {
        const userId = (req as any).user.id;
        cancelarInscricao(userId, id_evento);
        res.status(200).send({ mensagem: "Inscrição cancelada com sucesso" });
    } catch (err) {
        console.error(err);
        res.status(500).send({ erro: "Erro ao cancelar inscrição" });
    }
});

const formatarData = (dataStr: string) => {
    const [ano, mes, dia] = dataStr.split("-");
    return `${dia}/${mes}/${ano}`; // Ex: 05/05/2025
};

export default router;