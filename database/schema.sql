-- ============================================================
-- Student Enrollment System — Database Schema
-- ============================================================
-- Run this file in phpMyAdmin or MySQL shell to create
-- all tables. Safe to re-run: drops tables in correct order
-- to avoid foreign key constraint errors.
-- ============================================================

USE student_enrollment;

-- ─── Drop tables in reverse dependency order ─────────────────
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS users;

-- ─── Table: users ────────────────────────────────────────────
CREATE TABLE users (
  id          INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)      NOT NULL UNIQUE,
  password    VARCHAR(255)     NOT NULL,
  role        ENUM('admin','student') NOT NULL DEFAULT 'student',
  is_active   TINYINT(1)       NOT NULL DEFAULT 1,
  created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Table: students ─────────────────────────────────────────
CREATE TABLE students (
  id                   INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
  user_id              INT UNSIGNED     NOT NULL UNIQUE,
  student_id           VARCHAR(20)      NOT NULL UNIQUE,
  first_name           VARCHAR(50)      NOT NULL,
  middle_name          VARCHAR(50)      DEFAULT NULL,
  last_name            VARCHAR(50)      NOT NULL,
  email                VARCHAR(100)     NOT NULL UNIQUE,
  contact_number       VARCHAR(20)      DEFAULT NULL,
  course               VARCHAR(100)     NOT NULL,
  year_level           TINYINT UNSIGNED NOT NULL,
  must_change_password TINYINT(1)       NOT NULL DEFAULT 1,
  created_at           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_students_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- ─── Table: subjects ─────────────────────────────────────────
CREATE TABLE subjects (
  id            INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
  subject_code  VARCHAR(20)      NOT NULL UNIQUE,
  subject_name  VARCHAR(100)     NOT NULL,
  units         TINYINT UNSIGNED NOT NULL,
  schedule      VARCHAR(100)     NOT NULL,
  room          VARCHAR(50)      NOT NULL,
  instructor    VARCHAR(100)     DEFAULT NULL,
  is_active     TINYINT(1)       NOT NULL DEFAULT 1,
  created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Table: enrollments ──────────────────────────────────────
CREATE TABLE enrollments (
  id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  student_id  INT UNSIGNED  NOT NULL,
  subject_id  INT UNSIGNED  NOT NULL,
  enrolled_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status      ENUM('enrolled','dropped') NOT NULL DEFAULT 'enrolled',

  CONSTRAINT uq_enrollment
    UNIQUE (student_id, subject_id),

  CONSTRAINT fk_enrollment_student
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_enrollment_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ─── Seed: Default Admin Account ─────────────────────────────
-- Password is: Admin@1234
-- This hash was generated with bcrypt (10 salt rounds)
-- Change this password immediately after first login
INSERT INTO users (username, password, role)
VALUES (
  'admin',
  '$2b$10$s5bZknrpipF31k2Wxs5jL.LaYAjBpmedbpKeAVfwMtfy/XGE2I4uu',
  'admin'
);