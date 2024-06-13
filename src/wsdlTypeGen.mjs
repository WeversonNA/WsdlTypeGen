#!/usr/bin/env node
// wsdlTypeGen.mjs
import {
  writeFile,
  unlink,
  access,
  mkdir,
  rename,
  readdir,
  rmdir,
} from "fs/promises";
import { exec } from "child_process";
import path from "path";
import fetch from "node-fetch";
import urlModule from "url";

// Função para mover os arquivos gerados para a pasta desejada
async function moveGeneratedFiles(srcDir, destDir) {
  const files = await readdir(srcDir);
  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    await rename(srcFile, destFile);
  }
}

// Função para criar diretório e arquivo
async function createDirAndFile(dirPath, filePath, response) {
  await mkdir(dirPath);
  await writeFile(filePath, await response.text());
}

// Função para encontrar o diretório recém-criado
async function findNewDir(dirPath, oldDirs) {
  const currentDirs = new Set(await readdir(dirPath));
  for (const oldDir of oldDirs) {
    currentDirs.delete(oldDir);
  }
  if (currentDirs.size !== 1) {
    throw new Error("Expected exactly one new directory");
  }
  return [...currentDirs][0];
}

async function moveGeneratedFilesAndDeleteOldDir(srcDir, destDir) {
  await moveGeneratedFiles(srcDir, destDir);
  await rmdir(srcDir);
}

// Função para executar o comando wsdl-tsclient
function executeCommand(filePath, dirPath) {
  readdir(dirPath).then((oldDirs) => {
    exec(
      `wsdl-tsclient ${filePath} -o ./${dirPath}`,
      async (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
        }
        console.log(`stdout: ${stdout}`);

        // Encontrar o diretório recém-criado, mover os arquivos gerados para a pasta desejada e excluir a pasta antiga
        const newDir = await findNewDir(dirPath, oldDirs);
        const wsdlDirPath = path.join(dirPath, newDir);
        await moveGeneratedFilesAndDeleteOldDir(wsdlDirPath, dirPath);

        console.log("Arquivos gerados com sucesso!", filePath);
        // Deletar o arquivo .wsdl após a execução do comando
        await unlink(filePath);
      }
    );
  });
}

// Função principal
async function main() {
  //input do comando url;
  const url = process.argv[2];
  const urlObj = new urlModule.URL(url);
  const dirName = urlObj.pathname.split("/").filter(Boolean).join("_");

  try {
    const response = await fetch(url, { method: "GET" });
    const dirPath = path.join("./", dirName);
    const filePath = path.join("./", `${dirName}.wsdl`);

    // Verificar se a pasta já existe
    try {
      await access(dirPath);
      console.log(
        "O nome da pasta fornecido já existe. Por favor, verifique se a pasta já foi criada e confirme se os métodos necessários já foram implementados."
      );
    } catch {
      await createDirAndFile(dirPath, filePath, response);
      executeCommand(filePath, dirPath);
    }
  } catch (error) {
    console.error(`Erro ao buscar a URL: ${error}`);
  }
}

main();
