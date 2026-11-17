-- Sistema de Biblioteca Escolar - criação e população (MySQL 8+)
CREATE DATABASE IF NOT EXISTS biblioteca CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE biblioteca;

DROP TABLE IF EXISTS Emprestimo;
DROP TABLE IF EXISTS Livro;
DROP TABLE IF EXISTS Usuario;

CREATE TABLE Usuario (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(100) NOT NULL,
  email      VARCHAR(120) NOT NULL UNIQUE,
  senha      CHAR(64)     NOT NULL            -- hash SHA-256
);

CREATE TABLE Livro (
  id_livro   INT AUTO_INCREMENT PRIMARY KEY,
  titulo     VARCHAR(150) NOT NULL,
  autor      VARCHAR(100) NOT NULL,
  categoria  VARCHAR(60)  NOT NULL,
  quantidade INT NOT NULL DEFAULT 0,          -- exemplares disponíveis
  CONSTRAINT chk_quantidade CHECK (quantidade >= 0)
);

CREATE TABLE Emprestimo (
  id_emprestimo   INT AUTO_INCREMENT PRIMARY KEY,
  data_emprestimo DATE NOT NULL,
  data_devolucao  DATE NOT NULL,              -- data prevista
  data_devolvido  DATE NULL,                  -- preenchida ao devolver (NULL = ativo)
  id_usuario      INT NOT NULL,
  id_livro        INT NOT NULL,
  FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
  FOREIGN KEY (id_livro)   REFERENCES Livro(id_livro)
);

-- Senha de todos os usuários de teste: 123456
INSERT INTO Usuario (nome, email, senha) VALUES
 ('Ana Souza',    'ana@escola.com',   SHA2('123456',256)),
 ('Bruno Lima',   'bruno@escola.com', SHA2('123456',256)),
 ('Carla Mendes', 'carla@escola.com', SHA2('123456',256));

-- quantidade = exemplares disponíveis, já descontando empréstimos ativos
INSERT INTO Livro (titulo, autor, categoria, quantidade) VALUES
 ('Dom Casmurro',                    'Machado de Assis',          'Romance',    2),
 ('O Cortiço',                       'Aluísio Azevedo',           'Romance',    1),
 ('Memórias Póstumas de Brás Cubas', 'Machado de Assis',          'Romance',    0),
 ('O Pequeno Príncipe',              'Antoine de Saint-Exupéry',  'Infantil',   4),
 ('Introdução à Programação',        'Paulo Silva',               'Tecnologia', 3);

INSERT INTO Emprestimo (data_emprestimo, data_devolucao, data_devolvido, id_usuario, id_livro) VALUES
 ('2026-10-20','2026-10-27','2026-10-26', 1, 1),
 ('2026-10-25','2026-11-01','2026-11-01', 2, 1),
 ('2026-11-10','2026-11-17', NULL,        3, 3),
 ('2026-11-12','2026-11-19', NULL,        1, 2),
 ('2026-11-14','2026-11-21', NULL,        2, 1);
