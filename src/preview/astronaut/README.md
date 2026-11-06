# O astronauta como modelo 3D real

A página já sabe usar um modelo de verdade: basta existir
`public/cosmic/astronaut.glb`. Sem ele, entra o boneco feito em código
(`Model.ts`), que fica só como reserva.

O que o arquivo precisa ter:

- o personagem com textura (traje, capacete, mochila com o planeta),
- um esqueleto (rig) humano,
- **um** clipe de animação: ele sentado no chão, de joelhos para cima, e
  levantando até ficar parado de pé.

A virada de cabeça para o gráfico, o tempo da intro, a escala, a posição na
rocha, a luz e o reflexo do visor são feitos no código (`Rigged.ts`). O clipe
só precisa trazer o levantar.

## 1. Imagens de referência

Em `src/preview/references/model/` já estão quadros dos vídeos do cliente:

- `standing-back.png` e `standing-back-2.png`: de pé, de costas. É a melhor
  referência, porque é o personagem exato, inteiro e parado.
- `standing-three-quarter.png`: de pé, três-quartos.
- `seated-side.png`: sentado, com o capacete de lado.
- `turnaround-a.png` (**a usar**) e `turnaround-b.png`: folhas de turnaround
  geradas a partir do personagem, já cortadas por vista em `views-a/`
  (`front`, `left`, `back`, `front-three-quarter`) e `views-b/` (`front`,
  `left`, `back`, `right`). As costas da A batem quase exatamente com o
  original.

Os geradores de imagem→3D funcionam melhor com **várias vistas, fundo neutro e
pose em A**. Recomendo gerar antes uma folha de turnaround (frente, costas,
lado esquerdo e lado direito, fundo branco, braços levemente abertos) num
gerador de imagem (ChatGPT, Nano Banana, Midjourney), usando os quadros
acima como referência e pedindo para manter o capacete, a mochila com o
logo do planeta, as faixas escuras nas juntas e as luzes azuis da mochila.

## 2. Imagem → 3D

Use um destes, com entrada de várias vistas: **Tripo** (tripo3d.ai),
**Hyper3D Rodin** (hyper3d.ai) ou **Meshy** (meshy.ai).

- Textura PBR ligada, malha de 30–60 mil faces.
- Exportar em FBX ou GLB.
- Se der para separar o visor numa malha própria, chame essa malha de
  `Visor`. O código troca o material dela por um espelho que reflete o
  céu e as velas do gráfico, só verdes e azul-marinho, como o cliente pediu.

## 3. Rig e movimento (Mixamo, grátis)

1. mixamo.com → Upload Character → envie o FBX/OBJ e marque queixo, pulsos,
   cotovelos, joelhos e virilha.
2. Em Animations, busque **"stand up"** / **"sitting to standing"** e escolha
   um clipe que comece **sentado no chão, de joelhos para cima** e termine de
   pé e parado. É o movimento do vídeo 1.
3. Ajuste "Overdrive"/velocidade se precisar. Deixe "In Place" desligado se
   houver a opção, para os pés ficarem onde estão.
4. Download: FBX, **With Skin**, 30 fps.

## 4. Blender → GLB (grátis)

1. File → Import → FBX.
2. (Opcional, se o visor não veio separado) Edit Mode → selecione as faces
   do visor → `P` → Selection → renomeie o objeto para `Visor`.
3. File → Export → glTF 2.0: formato **glTF Binary (.glb)**, com Animation
   e Skinning ligados.
4. Salve como `public/cosmic/astronaut.glb`.

## 5. Me avise

Com o arquivo no lugar, eu:

- comprimo (meshopt + texturas WebP), para carregar rápido no celular;
- acerto em `MODEL` (`Rigged.ts`) o quadro em que ele está sentado
  (`from`), o quadro em que fica parado (`to`), a altura, o tempo dentro da
  intro e a direção do olhar;
- ajusto luz e materiais até ele sentar na pintura como o original.
