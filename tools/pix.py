"""Gera o Pix do card "Ajude a manter o FanficBlock".

Monta o "copia e cola" (BR Code estático, sem valor: quem doa escolhe quanto)
e o QR Code em SVG. Roda uma vez só; a extensão só carrega os arquivos
gerados, sem biblioteca de QR.

    pip install segno
    python3 tools/pix.py --key <chave> --name "Nome Da Conta" --city "Sao Paulo"

Gera:
    support.js         const JF_PIX = "<copia e cola>"
    icons/pix-qr.svg   QR do mesmo texto
"""

import argparse
import pathlib
import unicodedata

import segno

ROOT = pathlib.Path(__file__).resolve().parent.parent


def field(tag: str, value: str) -> str:
    return f"{tag}{len(value):02d}{value}"


def plain(text: str, limit: int) -> str:
    """Sem acento, maiúsculo e no tamanho que o padrão do Pix aceita."""
    text = unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode()
    return text.upper().strip()[:limit]


def crc16(payload: str) -> str:
    """CRC16-CCITT (polinômio 0x1021, início 0xFFFF), como pede o BR Code."""
    crc = 0xFFFF
    for byte in payload.encode():
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if crc & 0x8000 else crc << 1
            crc &= 0xFFFF
    return f"{crc:04X}"


def pix_payload(key: str, name: str, city: str) -> str:
    payload = (
        field("00", "01")
        + field("26", field("00", "br.gov.bcb.pix") + field("01", key.strip()))
        + field("52", "0000")
        + field("53", "986")  # real
        + field("58", "BR")
        + field("59", plain(name, 25))
        + field("60", plain(city, 15))
        + field("62", field("05", "***"))  # sem identificador de cobrança
        + "6304"
    )
    return payload + crc16(payload)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--key", required=True, help="chave Pix (de preferência aleatória)")
    parser.add_argument("--name", required=True, help="nome do recebedor, como aparece na conta")
    parser.add_argument("--city", required=True, help="cidade do recebedor")
    args = parser.parse_args()

    payload = pix_payload(args.key, args.name, args.city)

    # Correção de erro M e módulos escuros em fundo claro: é o que qualquer app
    # de banco lê sem drama. A borda clara (4 módulos) é obrigatória.
    qr = segno.make(payload, error="m", micro=False)
    qr.save(ROOT / "icons" / "pix-qr.svg", kind="svg", scale=4, border=4,
            dark="#09090b", light="#fafafa", xmldecl=False, svgns=True, nl=False)

    (ROOT / "support.js").write_text(
        "// Gerado por tools/pix.py — não edite à mão.\n"
        f'const JF_PIX = "{payload}";\n',
        encoding="utf-8",
    )
    print(payload)


if __name__ == "__main__":
    main()
