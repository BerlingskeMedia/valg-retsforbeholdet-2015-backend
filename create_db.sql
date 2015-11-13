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
