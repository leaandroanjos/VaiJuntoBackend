import { Router } from 'express';
import { cadastrarUsuario, compararSenhas, consultarUserPorEmail, gerarHash, getAll, putUser } from '../dao/usuarioDao';
import { gerarToken } from '../services/auth';
import { buscarEndereco, cepInvalidoError, getCoordenadas } from '../services/cep';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

//login
router.post('/users/login', async (req, res) => {
    const body = { ...req.body };
    try {
        const usuario = await consultarUserPorEmail(body.email, body.usuario); // espera a Promise resolver
        if (!usuario) {
            res.status(401).json({ erro: 'Não autorizado.' });
            return;
        }
        const bool = await compararSenhas(body.senha, usuario.senha_hash);
        const jwt = await gerarToken(String(usuario.id));
        if (bool) {
            res.status(200).json({
                nome: usuario.nome_completo,
                email: usuario.email,
                cep: usuario.cep,
                token: jwt
            });
            return;
        }
        res.status(401).json({ erro: 'Não autorizado.' });
        return;
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar usuários.' });
        return;
    }
});

//cadastro
router.post('/users/cadastro', async (req, res) => {
    const { nome_completo, nome_usuario, email, cep, senha } = req.body;
    try {
        const usuario = await consultarUserPorEmail(email, nome_usuario); // espera a Promise resolver
        if (usuario) {
            res.status(401).json({ erro: 'Usuário já cadastrado!' });
            return;
        }
        const hash = await gerarHash(senha);

        const endereco = await buscarEndereco(cep);

        const geoLoc = await getCoordenadas(endereco);
        if (geoLoc) {
            const id = cadastrarUsuario(nome_completo, nome_usuario, email, cep, hash, geoLoc.latitude, geoLoc.longitude);
            const jwt = await gerarToken(String(id));

            res.status(201).json({
                nome: nome_completo,
                email: email,
                cep: cep,
                token: jwt
            });
            return;
        } else {
            throw new Error("Erro na obtenção das coordenadas")
        }
    } catch (err) {
        if (err instanceof cepInvalidoError) {
            console.log(err)
            res.status(400).json({ erro: err.message });
            return;
        } else {
            console.log(err)
            res.status(500).json({ erro: 'Erro ao cadastrar usuários.' });
            return;
        }
    }
});

router.put('/atualizar-perfil', async (req, res) => {
    const { campo, novo_valor, email } = req.body;
    console.log(req.body);
    try {
        await putUser(campo, novo_valor, email);
        res.status(200).json({ mensagem: 'Dados atualizados com sucesso!' });
        return;
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar dados do usuário.' });
        return;
    }
});


export default router;