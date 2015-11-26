CREATE DATABASE IF NOT EXISTS `retsforbeholdet_2015` CHARACTER SET latin1 COLLATE latin1_danish_ci;

USE `retsforbeholdet_2015`;

CREATE TABLE IF NOT EXISTS `locations` (
  `ident` VARCHAR(10) NOT NULL,
  `ident_int` MEDIUMINT,
  `name` VARCHAR(255) NOT NULL,
  `areatype` VARCHAR(1) NOT NULL,
  `type` VARCHAR(25) NOT NULL,
  `parent_ident` VARCHAR(10),
  `votes_allowed` MEDIUMINT,
  `votes_made` MEDIUMINT,
  `votes_pct` FLOAT(4, 1),
  `votes_valid` MEDIUMINT,
  `votes_invalid_blank` MEDIUMINT,
  `votes_invalid_other` MEDIUMINT,
  `votes_invalid_total` MEDIUMINT,
  `votes_yes` MEDIUMINT,
  `votes_yes_pct` FLOAT(4, 1),
  `votes_no` MEDIUMINT,
  `votes_no_pct` FLOAT(4, 1),
  `status_code` TINYINT NOT NULL,
  `status_text` VARCHAR(100) NULL,
  `updated_at` DATETIME NOT NULL,
  `created_at` DATETIME,
  PRIMARY KEY (`ident`)
) ENGINE=InnoDB DEFAULT CHARACTER SET latin1 COLLATE latin1_danish_ci;
CREATE INDEX `location_ident` ON `locations` (`ident`);

INSERT INTO locations (ident, ident_int, name, areatype, type, parent_ident, votes_allowed, votes_made, votes_pct, votes_valid, votes_invalid_blank, votes_invalid_other, votes_invalid_total, votes_yes, votes_yes_pct, votes_no, votes_no_pct, status_code, status_text, updated_at, created_at)
VALUES ('0', 0, 'Hele landet', 'L', 'HeleLandet', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'Ikke startet', '2015-11-26 10:00:00', '2015-11-26 10:00:00');

CREATE TABLE IF NOT EXISTS `newsticker` (
  `id` MEDIUMINT NOT NULL AUTO_INCREMENT,
  `tweet` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET latin1 COLLATE latin1_danish_ci;

CREATE TABLE IF NOT EXISTS `newsticker_users` (
  `id` MEDIUMINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET latin1 COLLATE latin1_danish_ci;
