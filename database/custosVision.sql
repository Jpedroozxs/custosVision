CREATE DATABASE CustusVision;
USE CustusVision;

CREATE TABLE usuario(
	id_usuario INTEGER PRIMARY KEY AUTO_INCREMENT NOT NULL,
	cpf CHAR (11) NOT NULL UNIQUE CHECK (CHAR_LENGTH(cpf) = 11),
	nome VARCHAR(70) NOT NULL,
	email VARCHAR(150) NOT NULL UNIQUE,
	senha VARCHAR(70) NOT NULL CHECK (CHAR_LENGTH(senha) >= 6)
);

CREATE TABLE categoria(
	id_categoria INTEGER PRIMARY KEY AUTO_INCREMENT UNIQUE,
	nome VARCHAR(70) NOT NULL UNIQUE,
	id_usuario INTEGER NOT NULL,
	FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
);

CREATE TABLE renda(
	id_renda INTEGER PRIMARY KEY AUTO_INCREMENT UNIQUE,
	descricao VARCHAR(150),
	valor DECIMAL(10,2) NOT NULL CHECK(valor > 0),
	tipo_renda VARCHAR(70) NOT NULL,
	periodicidade VARCHAR(50),
	datas DATE NOT NULL,
	id_usuario INTEGER NOT NULL,
	FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
);

CREATE TABLE despesa(
	id_despesa INTEGER PRIMARY KEY AUTO_INCREMENT UNIQUE,
	descricao VARCHAR(150),
	tipo_despesa VARCHAR(70) NOT NULL,
	periodicidade VARCHAR(50),
	datas DATE NOT NULL,
	valor DECIMAL(10,2) NOT NULL CHECK(valor > 0),
	id_usuario INTEGER NOT NULL,
	FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
	id_categoria INTEGER,
	FOREIGN KEY (id_categoria) REFERENCES categoria (id_categoria)
);

CREATE TABLE meta(
	id_meta INTEGER PRIMARY KEY AUTO_INCREMENT UNIQUE,
	nome VARCHAR(150) NOT NULL UNIQUE,
	valor_objetivo DECIMAL(10,2) NOT NULL CHECK(valor_objetivo > 0),
	prazo DATE NOT NULL,
	status VARCHAR(50) NOT NULL,
	id_usuario INTEGER NOT NULL,
	FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
);

CREATE TABLE aporte_meta(
	id_aporte INTEGER PRIMARY KEY AUTO_INCREMENT UNIQUE,
	valor DECIMAL(10,2) NOT NULL CHECK(valor > 0),
	datas DATE NOT NULL,
	id_meta INTEGER NOT NULL,
	FOREIGN KEY (id_meta) REFERENCES meta (id_meta)
);