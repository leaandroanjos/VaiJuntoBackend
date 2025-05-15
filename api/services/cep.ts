export class cepInvalidoError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "cepInvalidoError";
    }
}

type viaCepResponse = {
    cep: string,
    logradouro: string,
    complemento: string,
    unidade: string,
    bairro: string,
    localidade: string,
    uf: string,
    ibge: string,
    gia: string,
    ddd: string,
    siafi: string
}

export async function buscarEndereco(cep: string) {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

    if (response.ok) {
        const body: viaCepResponse = await response.json();

        const rua = body.logradouro;
        const cidade = body.localidade;
        const estado = body.uf;

        return { cep, rua, cidade, estado };
    } else if (response.status === 400) {
        throw new cepInvalidoError(`O cep ${cep} é inválido`);
    } else {
        throw new Error("Erro ao buscar o CEP");
    }
}

interface LocationResponse {
    place_id: number;
    licence: string;
    osm_type: string;
    osm_id: number;
    lat: string;
    lon: string;
    class: string;
    type: string;
    place_rank: number;
    importance: number;
    addresstype: string;
    name: string;
    display_name: string;
    boundingbox: [string, string, string, string];
}

type LocationResponseArray = LocationResponse[];

export async function getCoordenadas(end: { cep: string, rua: string, cidade: string, estado: string }) {
    const query = `street=${end.rua}&city=${end.cidade}&state=${end.estado}&country=Brazil&format=json`;
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`);
    if (response.ok) {
        const results: any = await response.json();
        if (results.length === 0) {
            throw new Error("Erro na consulta da longitudade")
        } else {
            if (results[0]) {
                return { longitude: parseFloat(results[0].lon), latitude: parseFloat(results[0].lat) };
            }
        }
    } else {
        throw new Error("Erro na consulta da latitudade");
    }
}
