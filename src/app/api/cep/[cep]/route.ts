import { NextResponse } from "next/server";

type Context = {
  params: Promise<{ cep: string }>;
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export async function GET(_: Request, context: Context) {
  try {
    const { cep } = await context.params;
    const normalizedCep = onlyDigits(cep);

    if (normalizedCep.length !== 8) {
      return NextResponse.json({ error: "CEP invalido." }, { status: 400 });
    }

    const response = await fetch(`https://viacep.com.br/ws/${normalizedCep}/json/`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Falha ao consultar o CEP." }, { status: 502 });
    }

    const data = (await response.json()) as {
      erro?: boolean;
      cep?: string;
      logradouro?: string;
      complemento?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };

    if (data.erro) {
      return NextResponse.json({ error: "CEP nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        cep: data.cep ?? "",
        street: data.logradouro ?? "",
        complement: data.complemento ?? "",
        district: data.bairro ?? "",
        city: data.localidade ?? "",
        state: data.uf ?? "",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao consultar CEP." },
      { status: 500 },
    );
  }
}
