// src/data/holdings/index.ts

// 1) Statische JSON-Imports aus jeweiligen Unterordnern:

//Bill Gates
import gates_2013_Q3 from './gates/2013-Q3.json'
import gates_2013_Q4 from './gates/2013-Q4.json'
import gates_2014_Q1 from './gates/2014-Q1.json'
import gates_2014_Q2 from './gates/2014-Q2.json'
import gates_2024_Q2 from './gates/2024-Q2.json'
import gates_2024_Q3 from './gates/2024-Q3.json'
import gates_2024_Q4 from './gates/2024-Q4.json'
import gates_2025_Q1 from './gates/2025-Q1.json'
import gates_2025_Q2 from './gates/2025-Q2.json'

//Warren Buffet

import buffett_2022_Q4 from './buffett/2022-Q4.json'
import buffett_2022_Q3 from './buffett/2022-Q3.json'
import buffett_2022_Q2 from './buffett/2022-Q2.json'
import buffett_2022_Q1 from './buffett/2022-Q1.json'

import buffett_2023_Q1 from './buffett/2023-Q1.json'
import buffett_2023_Q2 from './buffett/2023-Q2.json'
import buffett_2023_Q3 from './buffett/2023-Q3.json'
import buffett_2023_Q4 from './buffett/2023-Q4.json'

import buffett_2024_Q1 from './buffett/2024-Q1.json'
import buffett_2024_Q2 from './buffett/2024-Q2.json'
import buffett_2024_Q3 from './buffett/2024-Q3.json'
import buffett_2024_Q4 from './buffett/2024-Q4.json'

import buffett_2025_Q1 from './buffett/2025-Q1.json'
import buffett_2025_Q2 from './buffett/2025-Q2.json'

//Bill Ackman
import ackman_2023_Q1 from './ackman/2023-Q1.json'
import ackman_2023_Q2 from './ackman/2023-Q2.json'
import ackman_2023_Q3 from './ackman/2023-Q3.json'
import ackman_2023_Q4 from './ackman/2023-Q4.json'
import ackman_2024_Q1 from './ackman/2024-Q1.json'
import ackman_2024_Q2 from './ackman/2024-Q2.json'
import ackman_2024_Q3 from './ackman/2024-Q3.json'
import ackman_2024_Q4 from './ackman/2024-Q4.json'
import ackman_2025_Q1 from './ackman/2025-Q1.json'
import ackman_2025_Q2 from './ackman/2025-Q2.json'

//Marks

import marks_2024_Q3 from './marks/2024-Q3.json'
import marks_2024_Q4 from './marks/2024-Q4.json'
import marks_2025_Q1 from './marks/2025-Q1.json'
import marks_2025_Q2 from './marks/2025-Q2.json'


//akre
import akre_2024_Q1 from './akre/2024-Q1.json'
import akre_2024_Q2 from './akre/2024-Q2.json'
import akre_2024_Q3 from './akre/2024-Q3.json'
import akre_2024_Q4 from './akre/2024-Q4.json'
import akre_2025_Q1 from './akre/2025-Q1.json'
import akre_2025_Q2 from './akre/2025-Q2.json'

//olstein
import olstein_2024_Q1 from './olstein/2024-Q1.json'
import olstein_2024_Q2 from './olstein/2024-Q2.json'
import olstein_2024_Q3 from './olstein/2024-Q3.json'
import olstein_2024_Q4 from './olstein/2024-Q4.json'
import olstein_2025_Q1 from './olstein/2025-Q1.json'
import olstein_2025_Q2 from './olstein/2025-Q2.json'

//greenberg
import greenberg_2024_Q1 from './greenberg/2024-Q1.json'
import greenberg_2024_Q2 from './greenberg/2024-Q2.json'
import greenberg_2024_Q3 from './greenberg/2024-Q3.json'
import greenberg_2024_Q4 from './greenberg/2024-Q4.json'
import greenberg_2025_Q1 from './greenberg/2025-Q1.json'
import greenberg_2025_Q2 from './greenberg/2025-Q2.json'

//greenhaven
import greenhaven_2024_Q1 from './greenhaven/2024-Q1.json'
import greenhaven_2024_Q2 from './greenhaven/2024-Q2.json'
import greenhaven_2024_Q3 from './greenhaven/2024-Q3.json'
import greenhaven_2024_Q4 from './greenhaven/2024-Q4.json'
import greenhaven_2025_Q1 from './greenhaven/2025-Q1.json'
import greenhaven_2025_Q2 from './greenhaven/2025-Q2.json'

//greenhaven
import gregalexander_2024_Q1 from './gregalexander/2024-Q1.json'
import gregalexander_2024_Q2 from './gregalexander/2024-Q2.json'
import gregalexander_2024_Q3 from './gregalexander/2024-Q3.json'
import gregalexander_2024_Q4 from './gregalexander/2024-Q4.json'
import gregalexander_2025_Q1 from './gregalexander/2025-Q1.json'
import gregalexander_2025_Q2 from './gregalexander/2025-Q2.json'

//Terry Smith
import smith_2024_Q4 from './smith/2024-Q4.json'
import smith_2025_Q1 from './smith/2025-Q1.json'
import smith_2025_Q2 from './smith/2025-Q2.json'

//Michael Burry
import burry_2024_Q3 from './burry/2024-Q3.json'
import burry_2024_Q4 from './burry/2024-Q4.json'
import burry_2025_Q1 from './burry/2025-Q1.json'
import burry_2025_Q2 from './burry/2025-Q2.json'

//Li Lu
import lilu_2024_Q4 from './lilu/2024-Q4.json'
import lilu_2025_Q1 from './lilu/2025-Q1.json'
import lilu_2025_Q2 from './lilu/2025-Q2.json'

//Altarock Partners
import   altarockpartners_2024_Q4 from './altarockpartners/2024-Q4.json'
import   altarockpartners_2025_Q1 from './altarockpartners/2025-Q1.json'
import   altarockpartners_2025_Q2 from './altarockpartners/2025-Q2.json'

//Bill Miller
import   miller_2024_Q4 from './miller/2024-Q4.json'
import   miller_2025_Q1 from './miller/2025-Q1.json'
import   miller_2025_Q2 from './miller/2025-Q2.json'

// Chase Coleman
import coleman_2024_Q1 from './coleman/2024-Q1.json'
import coleman_2024_Q2 from './coleman/2024-Q2.json'
import coleman_2024_Q3 from './coleman/2024-Q3.json'
import coleman_2024_Q4 from './coleman/2024-Q4.json'
import coleman_2025_Q1 from './coleman/2025-Q1.json'
import coleman_2025_Q2 from './coleman/2025-Q2.json'

//gayner
import gayner_2024_Q1 from './gayner/2024-Q1.json'
import gayner_2024_Q2 from './gayner/2024-Q2.json'
import gayner_2024_Q3 from './gayner/2024-Q3.json'
import gayner_2024_Q4 from './gayner/2024-Q4.json'
import gayner_2025_Q1 from './gayner/2025-Q1.json'
import gayner_2025_Q2 from './gayner/2025-Q2.json'

//ainslie
import ainslie_2024_Q1 from './ainslie/2024-Q1.json'
import ainslie_2024_Q2 from './ainslie/2024-Q2.json'
import ainslie_2024_Q3 from './ainslie/2024-Q3.json'
import ainslie_2024_Q4 from './ainslie/2024-Q4.json'
import ainslie_2025_Q1 from './ainslie/2025-Q1.json'
import ainslie_2025_Q2 from './ainslie/2025-Q2.json'

//tepper
import tepper_2024_Q1 from './tepper/2024-Q1.json'
import tepper_2024_Q2 from './tepper/2024-Q2.json'
import tepper_2024_Q3 from './tepper/2024-Q3.json'
import tepper_2024_Q4 from './tepper/2024-Q4.json'
import tepper_2025_Q1 from './tepper/2025-Q1.json'
import tepper_2025_Q2 from './tepper/2025-Q2.json'

//pabrai
import pabrai_2024_Q1 from './pabrai/2024-Q1.json'
import pabrai_2024_Q2 from './pabrai/2024-Q2.json'
import pabrai_2024_Q3 from './pabrai/2024-Q3.json'
import pabrai_2024_Q4 from './pabrai/2024-Q4.json'
import pabrai_2025_Q1 from './pabrai/2025-Q1.json'
import pabrai_2025_Q2 from './pabrai/2025-Q2.json'

//einhorn
import einhorn_2024_Q2 from './einhorn/2024-Q2.json'
import einhorn_2024_Q3 from './einhorn/2024-Q3.json'
import einhorn_2024_Q4 from './einhorn/2024-Q4.json'
import einhorn_2025_Q1 from './einhorn/2025-Q1.json'
import einhorn_2025_Q2 from './einhorn/2025-Q2.json'

//hohn
import hohn_2024_Q2 from './hohn/2024-Q2.json'
import hohn_2024_Q3 from './hohn/2024-Q3.json'
import hohn_2024_Q4 from './hohn/2024-Q4.json'
import hohn_2025_Q1 from './hohn/2025-Q1.json'
import hohn_2025_Q2 from './hohn/2025-Q2.json'

//yacktman
import yacktman_2024_Q2 from './yacktman/2024-Q2.json'
import yacktman_2024_Q3 from './yacktman/2024-Q3.json'
import yacktman_2024_Q4 from './yacktman/2024-Q4.json'
import yacktman_2025_Q1 from './yacktman/2025-Q1.json'
import yacktman_2025_Q2 from './yacktman/2025-Q2.json'


//polen
import polen_2024_Q2 from './polen/2024-Q2.json'
import polen_2024_Q3 from './polen/2024-Q3.json'
import polen_2024_Q4 from './polen/2024-Q4.json'
import polen_2025_Q1 from './polen/2025-Q1.json'
import polen_2025_Q2 from './polen/2025-Q2.json'


//viking
import viking_2023_Q4 from './viking/2023-Q4.json'
import viking_2024_Q1 from './viking/2024-Q1.json'
//import viking_2024_Q1 from './viking/2024-Q1.json'
import viking_2024_Q3 from './viking/2024-Q3.json'
//import viking_2024_Q4 from './viking/2024-Q4.json'
//import viking_2025_Q1 from './viking/2025-Q1.json'


//hohn
import bloomstran_2024_Q2 from './bloomstran/2024-Q2.json'
import bloomstran_2024_Q3 from './bloomstran/2024-Q3.json'
import bloomstran_2024_Q4 from './bloomstran/2024-Q4.json'
import bloomstran_2025_Q1 from './bloomstran/2025-Q1.json'
import bloomstran_2025_Q2 from './bloomstran/2025-Q2.json'

//vinall
import vinall_2024_Q2 from './vinall/2024-Q2.json'
import vinall_2024_Q3 from './vinall/2024-Q3.json'
import vinall_2024_Q4 from './vinall/2024-Q4.json'
import vinall_2025_Q1 from './vinall/2025-Q1.json'
import vinall_2025_Q2 from './vinall/2025-Q2.json'

//Cantillion Capital Mgmt
import cantillon_2024_Q2 from './cantillon/2024-Q2.json'
import cantillon_2024_Q3 from './cantillon/2024-Q3.json'
import cantillon_2024_Q4 from './cantillon/2024-Q4.json'
import cantillon_2025_Q1 from './cantillon/2025-Q1.json'
import cantillon_2025_Q2 from './cantillon/2025-Q2.json'

//Cantillion Capital Mgmt
import duan_2024_Q2 from './duan/2024-Q2.json'
import duan_2024_Q3 from './duan/2024-Q3.json'
import duan_2024_Q4 from './duan/2024-Q4.json'
import duan_2025_Q1 from './duan/2025-Q1.json'

//Cantillion Capital Mgmt
import mandel_2024_Q2 from './mandel/2024-Q2.json'
import mandel_2024_Q3 from './mandel/2024-Q3.json'
import mandel_2024_Q4 from './mandel/2024-Q4.json'
import mandel_2025_Q1 from './mandel/2025-Q1.json'
import mandel_2025_Q2 from './mandel/2025-Q2.json'

//ellenbogen
import ellenbogen_2024_Q2 from './ellenbogen/2024-Q2.json'
import ellenbogen_2024_Q3 from './ellenbogen/2024-Q3.json'
import ellenbogen_2024_Q4 from './ellenbogen/2024-Q4.json'
import ellenbogen_2025_Q1 from './ellenbogen/2025-Q1.json'

//ellenbogen
import jensen_2024_Q2 from './jensen/2024-Q2.json'
import jensen_2024_Q3 from './jensen/2024-Q3.json'
import jensen_2024_Q4 from './jensen/2024-Q4.json'
import jensen_2025_Q1 from './jensen/2025-Q1.json'
import jensen_2025_Q2 from './jensen/2025-Q2.json'

//russo
import russo_2024_Q2 from './russo/2024-Q2.json'
import russo_2024_Q3 from './russo/2024-Q3.json'
import russo_2024_Q4 from './russo/2024-Q4.json'
import russo_2025_Q1 from './russo/2025-Q1.json'
import russo_2025_Q2 from './russo/2025-Q2.json'

//armitage
import armitage_2024_Q2 from './armitage/2024-Q2.json'
import armitage_2024_Q3 from './armitage/2024-Q3.json'
import armitage_2024_Q4 from './armitage/2024-Q4.json'
import armitage_2025_Q1 from './armitage/2025-Q1.json'
import armitage_2025_Q2 from './armitage/2025-Q2.json'

//icahn
import icahn_2024_Q2 from './icahn/2024-Q2.json'
import icahn_2024_Q3 from './icahn/2024-Q3.json'
import icahn_2024_Q4 from './icahn/2024-Q4.json'
import icahn_2025_Q1 from './icahn/2025-Q1.json'
import icahn_2025_Q2 from './icahn/2025-Q2.json'

//icahn
import abrams_2024_Q2 from './abrams/2024-Q2.json'
import abrams_2024_Q3 from './abrams/2024-Q3.json'
import abrams_2024_Q4 from './abrams/2024-Q4.json'
import abrams_2025_Q1 from './abrams/2025-Q1.json'
import abrams_2025_Q2 from './abrams/2025-Q2.json'

//fred martin
import martin_2024_Q2 from './martin/2024-Q2.json'
import martin_2024_Q3 from './martin/2024-Q3.json'
import martin_2024_Q4 from './martin/2024-Q4.json'
import martin_2025_Q1 from './martin/2025-Q1.json'

//lindsell train
import train_2024_Q2 from './train/2024-Q2.json'
import train_2024_Q3 from './train/2024-Q3.json'
import train_2024_Q4 from './train/2024-Q4.json'
import train_2025_Q1 from './train/2025-Q1.json'
import train_2025_Q2 from './train/2025-Q2.json'

//andrew brenton
import brenton_2024_Q2 from './brenton/2024-Q2.json'
import brenton_2024_Q3 from './brenton/2024-Q3.json'
import brenton_2024_Q4 from './brenton/2024-Q4.json'
import brenton_2025_Q1 from './brenton/2025-Q1.json'

//andrew brenton
import burn_2024_Q2 from './burn/2024-Q2.json'
import burn_2024_Q3 from './burn/2024-Q3.json'
import burn_2024_Q4 from './burn/2024-Q4.json'
import burn_2025_Q1 from './burn/2025-Q1.json'
import burn_2025_Q2 from './burn/2025-Q2.json'

//dorsey
import dorsey_2024_Q2 from './dorsey/2024-Q2.json'
import dorsey_2024_Q3 from './dorsey/2024-Q3.json'
import dorsey_2024_Q4 from './dorsey/2024-Q4.json'
import dorsey_2025_Q1 from './dorsey/2025-Q1.json'
import dorsey_2025_Q2 from './dorsey/2025-Q2.json'

//chou
import chou_2024_Q2 from './chou/2024-Q2.json'
import chou_2024_Q3 from './chou/2024-Q3.json'
import chou_2024_Q4 from './chou/2024-Q4.json'
import chou_2025_Q1 from './chou/2025-Q1.json'
import chou_2025_Q2 from './chou/2025-Q2.json'

//lawrence
import lawrence_2024_Q2 from './lawrence/2024-Q2.json'
import lawrence_2024_Q3 from './lawrence/2024-Q3.json'
import lawrence_2024_Q4 from './lawrence/2024-Q4.json'
import lawrence_2025_Q1 from './lawrence/2025-Q1.json'
import lawrence_2025_Q2 from './lawrence/2025-Q2.json'

//roepers
import roepers_2024_Q2 from './roepers/2024-Q2.json'
import roepers_2024_Q3 from './roepers/2024-Q3.json'
import roepers_2024_Q4 from './roepers/2024-Q4.json'
import roepers_2025_Q1 from './roepers/2025-Q1.json'
import roepers_2025_Q2 from './roepers/2025-Q2.json'

//munger
import munger_2024_Q2 from './munger/2024-Q2.json'
//import munger_2024_Q3 from './munger/2024-Q3.json'
import munger_2024_Q4 from './munger/2024-Q4.json'
import munger_2025_Q1 from './munger/2025-Q1.json'

//lou
import lou_2024_Q2 from './lou/2024-Q2.json'
import lou_2024_Q3 from './lou/2024-Q3.json'
import lou_2024_Q4 from './lou/2024-Q4.json'
import lou_2025_Q1 from './lou/2025-Q1.json'
import lou_2025_Q2 from './lou/2025-Q2.json'

//wyden
import wyden_2024_Q2 from './wyden/2024-Q2.json'
import wyden_2024_Q3 from './wyden/2024-Q3.json'
import wyden_2024_Q4 from './wyden/2024-Q4.json'
import wyden_2025_Q1 from './wyden/2025-Q1.json'

//muhlenkamp
import muhlenkamp_2024_Q2 from './muhlenkamp/2024-Q2.json'
import muhlenkamp_2024_Q3 from './muhlenkamp/2024-Q3.json'
import muhlenkamp_2024_Q4 from './muhlenkamp/2024-Q4.json'
import muhlenkamp_2025_Q1 from './muhlenkamp/2025-Q1.json'

//tarasoff
import tarasoff_2024_Q2 from './tarasoff/2024-Q2.json'
import tarasoff_2024_Q3 from './tarasoff/2024-Q3.json'
import tarasoff_2024_Q4 from './tarasoff/2024-Q4.json'
import tarasoff_2025_Q1 from './tarasoff/2025-Q1.json'
import tarasoff_2025_Q2 from './tarasoff/2025-Q2.json'

//welling
import welling_2024_Q2 from './welling/2024-Q2.json'
import welling_2024_Q3 from './welling/2024-Q3.json'
import welling_2024_Q4 from './welling/2024-Q4.json'
import welling_2025_Q1 from './welling/2025-Q1.json'
import welling_2025_Q2 from './welling/2025-Q2.json'

//rolfe
import rolfe_2024_Q2 from './rolfe/2024-Q2.json'
import rolfe_2024_Q3 from './rolfe/2024-Q3.json'
import rolfe_2024_Q4 from './rolfe/2024-Q4.json'
import rolfe_2025_Q1 from './rolfe/2025-Q1.json'
import rolfe_2025_Q2 from './rolfe/2025-Q2.json'

//karr
import karr_2024_Q2 from './karr/2024-Q2.json'
import karr_2024_Q3 from './karr/2024-Q3.json'
import karr_2024_Q4 from './karr/2024-Q4.json'
import karr_2025_Q1 from './karr/2025-Q1.json'

//hong
import hong_2024_Q2 from './hong/2024-Q2.json'
import hong_2024_Q3 from './hong/2024-Q3.json'
import hong_2024_Q4 from './hong/2024-Q4.json'
import hong_2025_Q1 from './hong/2025-Q1.json'
import hong_2025_Q2 from './hong/2025-Q2.json'

//bares
import bares_2024_Q2 from './bares/2024-Q2.json'
import bares_2024_Q3 from './bares/2024-Q3.json'
import bares_2024_Q4 from './bares/2024-Q4.json'
import bares_2025_Q1 from './bares/2025-Q1.json'

//berkowitz
import berkowitz_2024_Q2 from './berkowitz/2024-Q2.json'
import berkowitz_2024_Q3 from './berkowitz/2024-Q3.json'
import berkowitz_2024_Q4 from './berkowitz/2024-Q4.json'
import berkowitz_2025_Q1 from './berkowitz/2025-Q1.json'
import berkowitz_2025_Q2 from './berkowitz/2025-Q2.json'

//watsa
import watsa_2024_Q2 from './watsa/2024-Q2.json'
import watsa_2024_Q3 from './watsa/2024-Q3.json'
import watsa_2024_Q4 from './watsa/2024-Q4.json'
import watsa_2025_Q1 from './watsa/2025-Q1.json'
import watsa_2025_Q2 from './watsa/2025-Q2.json'

//sosin
import sosin_2024_Q2 from './sosin/2024-Q2.json'
import sosin_2024_Q3 from './sosin/2024-Q3.json'
import sosin_2024_Q4 from './sosin/2024-Q4.json'
import sosin_2025_Q1 from './sosin/2025-Q1.json'
import sosin_2025_Q2 from './sosin/2025-Q2.json'

//meritage
import meritage_2024_Q2 from './meritage/2024-Q2.json'
import meritage_2024_Q3 from './meritage/2024-Q3.json'
import meritage_2024_Q4 from './meritage/2024-Q4.json'
import meritage_2025_Q1 from './meritage/2025-Q1.json'

//ketterer
import ketterer_2024_Q2 from './ketterer/2024-Q2.json'
import ketterer_2024_Q3 from './ketterer/2024-Q3.json'
import ketterer_2024_Q4 from './ketterer/2024-Q4.json'
import ketterer_2025_Q1 from './ketterer/2025-Q1.json'

//vulcanvalue
import vulcanvalue_2024_Q2 from './vulcanvalue/2024-Q2.json'
import vulcanvalue_2024_Q3 from './vulcanvalue/2024-Q3.json'
import vulcanvalue_2024_Q4 from './vulcanvalue/2024-Q4.json'
import vulcanvalue_2025_Q1 from './vulcanvalue/2025-Q1.json'

//davis
import davis_2024_Q2 from './davis/2024-Q2.json'
import davis_2024_Q3 from './davis/2024-Q3.json'
import davis_2024_Q4 from './davis/2024-Q4.json'
import davis_2025_Q1 from './davis/2025-Q1.json'
import davis_2025_Q2 from './davis/2025-Q2.json'

//mairspower
//import mairspower_2024_Q2 from './mairspower/2024-Q2.json'
//import mairspower_2024_Q3 from './mairspower/2024-Q3.json'
import mairspower_2024_Q4 from './mairspower/2024-Q4.json'
import mairspower_2025_Q1 from './mairspower/2025-Q1.json'
import mairspower_2025_Q2 from './mairspower/2025-Q2.json'

//nygren
import nygren_2024_Q2 from './nygren/2024-Q2.json'
import nygren_2024_Q3 from './nygren/2024-Q3.json'
import nygren_2024_Q4 from './nygren/2024-Q4.json'
import nygren_2025_Q1 from './nygren/2025-Q1.json'
//import nygren_2025_Q2 from './nygren/2025-Q2.json'

//cunniff
import cunniff_2024_Q2 from './cunniff/2024-Q2.json'
import cunniff_2024_Q3 from './cunniff/2024-Q3.json'
import cunniff_2024_Q4 from './cunniff/2024-Q4.json'
import cunniff_2025_Q1 from './cunniff/2025-Q1.json'
import cunniff_2025_Q2 from './cunniff/2025-Q2.json'

//hawkins
import hawkins_2024_Q2 from './hawkins/2024-Q2.json'
import hawkins_2024_Q3 from './hawkins/2024-Q3.json'
import hawkins_2024_Q4 from './hawkins/2024-Q4.json'
import hawkins_2025_Q1 from './hawkins/2025-Q1.json'
import hawkins_2025_Q2 from './hawkins/2025-Q2.json'

//torray
import torray_2024_Q2 from './torray/2024-Q2.json'
import torray_2024_Q3 from './torray/2024-Q3.json'
import torray_2024_Q4 from './torray/2024-Q4.json'
import torray_2025_Q1 from './torray/2025-Q1.json'
import torray_2025_Q2 from './torray/2025-Q2.json'

//rogers
//import rogers_2024_Q2 from './rogers/2024-Q2.json'
//import rogers_2024_Q3 from './rogers/2024-Q3.json'
import rogers_2024_Q4 from './rogers/2024-Q4.json'
import rogers_2025_Q1 from './rogers/2025-Q1.json'
import rogers_2025_Q2 from './rogers/2025-Q2.json'

//katz
//import rogers_2024_Q2 from './rogers/2024-Q2.json'
//import rogers_2024_Q3 from './rogers/2024-Q3.json'
import katz_2024_Q4 from './katz/2024-Q4.json'
import katz_2025_Q1 from './katz/2025-Q1.json'
//import rogers_2025_Q2 from './rogers/2025-Q2.json'

//klarman
import klarman_2024_Q2 from './klarman/2024-Q2.json'
import klarman_2024_Q3 from './klarman/2024-Q3.json'
import klarman_2024_Q4 from './klarman/2024-Q4.json'
import klarman_2025_Q1 from './klarman/2025-Q1.json'
import klarman_2025_Q2 from './klarman/2025-Q2.json'

//spier
import spier_2024_Q2 from './spier/2024-Q2.json'
import spier_2024_Q3 from './spier/2024-Q3.json'
import spier_2024_Q4 from './spier/2024-Q4.json'
import spier_2025_Q1 from './spier/2025-Q1.json'
import spier_2025_Q2 from './spier/2025-Q2.json'

//triplefrond
import triplefrond_2024_Q2 from './triplefrond/2024-Q2.json'
import triplefrond_2024_Q3 from './triplefrond/2024-Q3.json'
import triplefrond_2024_Q4 from './triplefrond/2024-Q4.json'
import triplefrond_2025_Q1 from './triplefrond/2025-Q1.json'
import triplefrond_2025_Q2 from './triplefrond/2025-Q2.json'

//ubben
import ubben_2024_Q2 from './ubben/2024-Q2.json'
import ubben_2024_Q3 from './ubben/2024-Q3.json'
import ubben_2024_Q4 from './ubben/2024-Q4.json'
import ubben_2025_Q1 from './ubben/2025-Q1.json'
import ubben_2025_Q2 from './ubben/2025-Q2.json'

//donaldsmith
import donaldsmith_2024_Q2 from './donaldsmith/2024-Q2.json'
import donaldsmith_2024_Q3 from './donaldsmith/2024-Q3.json'
import donaldsmith_2024_Q4 from './donaldsmith/2024-Q4.json'
import donaldsmith_2025_Q1 from './donaldsmith/2025-Q1.json'
import donaldsmith_2025_Q2 from './donaldsmith/2025-Q2.json'

//dodgecox
import dodgecox_2024_Q2 from './dodgecox/2024-Q2.json'
import dodgecox_2024_Q3 from './dodgecox/2024-Q3.json'
import dodgecox_2024_Q4 from './dodgecox/2024-Q4.json'
import dodgecox_2025_Q1 from './dodgecox/2025-Q1.json'
import dodgecox_2025_Q2 from './dodgecox/2025-Q2.json'

//whitman
import whitman_2024_Q2 from './whitman/2024-Q2.json'
import whitman_2024_Q3 from './whitman/2024-Q3.json'
import whitman_2024_Q4 from './whitman/2024-Q4.json'
import whitman_2025_Q1 from './whitman/2025-Q1.json'
import whitman_2025_Q2 from './whitman/2025-Q2.json'

//greenbrier
import greenbrier_2024_Q2 from './greenbrier/2024-Q2.json'
import greenbrier_2024_Q3 from './greenbrier/2024-Q3.json'
import greenbrier_2024_Q4 from './greenbrier/2024-Q4.json'
import greenbrier_2025_Q1 from './greenbrier/2025-Q1.json'
import greenbrier_2025_Q2 from './greenbrier/2025-Q2.json'

//peltz
import peltz_2024_Q2 from './peltz/2024-Q2.json'
import peltz_2024_Q3 from './peltz/2024-Q3.json'
import peltz_2024_Q4 from './peltz/2024-Q4.json'
import peltz_2025_Q1 from './peltz/2025-Q1.json'
import peltz_2025_Q2 from './peltz/2025-Q2.json'

//kantesaria
import kantesaria_2024_Q2 from './kantesaria/2024-Q2.json'
import kantesaria_2024_Q3 from './kantesaria/2024-Q3.json'
import kantesaria_2024_Q4 from './kantesaria/2024-Q4.json'
import kantesaria_2025_Q1 from './kantesaria/2025-Q1.json'
import kantesaria_2025_Q2 from './kantesaria/2025-Q2.json'


// … für jeden weiteren Slug analog …

// 2) Typen
export interface HoldingsFile {
  date: string
  positions: Array<{
    cusip:  string
    name:   string
    shares: number
    value:  number
  }>
}

export interface Snapshot {
  quarter: string
  data: HoldingsFile
}

// 3) Historie pro Investor
const holdingsHistory: Record<string, Snapshot[]> = {
  gates: [
    { quarter: '2013-Q3', data: gates_2013_Q3 },
    { quarter: '2013-Q4', data: gates_2013_Q4 },
    { quarter: '2014-Q1', data: gates_2014_Q1 },
    { quarter: '2014-Q2', data: gates_2014_Q2 },
    { quarter: '2024-Q2', data: gates_2024_Q2 },
    { quarter: '2024-Q3', data: gates_2024_Q3 },
    { quarter: '2024-Q4', data: gates_2024_Q4 },
    { quarter: '2025-Q1', data: gates_2025_Q1 },
    { quarter: '2025-Q2', data: gates_2025_Q2 },
  ],

  buffett: [
   
    //{ quarter: '2022-Q1', data: buffett_2022_Q1 },
    //{ quarter: '2022-Q2', data: buffett_2022_Q2 },
    //{ quarter: '2022-Q3', data: buffett_2022_Q3 },
    //{ quarter: '2022-Q4', data: buffett_2022_Q4 },
    { quarter: '2023-Q1', data: buffett_2023_Q1 },
    { quarter: '2023-Q2', data: buffett_2023_Q2 },
    { quarter: '2023-Q3', data: buffett_2023_Q3 },
    { quarter: '2023-Q4', data: buffett_2023_Q4 },
    { quarter: '2024-Q1', data: buffett_2024_Q1 },
    { quarter: '2024-Q2', data: buffett_2024_Q2 },
    { quarter: '2024-Q3', data: buffett_2024_Q3 },
    { quarter: '2024-Q4', data: buffett_2024_Q4 },
    { quarter: '2025-Q1', data: buffett_2025_Q1 },
    { quarter: '2025-Q2', data: buffett_2025_Q2 },
   // …
  ],
  ackman: [
    { quarter: '2023-Q1', data: ackman_2023_Q1 },
    { quarter: '2023-Q2', data: ackman_2023_Q2 },
    { quarter: '2023-Q3', data: ackman_2023_Q3 },
    { quarter: '2023-Q4', data: ackman_2023_Q4 }, 
    { quarter: '2024-Q1', data: ackman_2024_Q1 },
    { quarter: '2024-Q2', data: ackman_2024_Q2 },
    { quarter: '2024-Q3', data: ackman_2024_Q3 },
    { quarter: '2024-Q4', data: ackman_2024_Q4 },
    { quarter: '2025-Q1', data: ackman_2025_Q1 },
    { quarter: '2025-Q2', data: ackman_2025_Q2 },
    // …
   ],

   marks: [
   
    //{ quarter: '2024-Q1', data: marks_2024_Q1 },
    //{ quarter: '2024-Q2', data: marks_2024_Q2 },
    { quarter: '2024-Q3', data: marks_2024_Q3 },
    { quarter: '2024-Q4', data: marks_2024_Q4 },
    { quarter: '2025-Q1', data: marks_2025_Q1 },
    { quarter: '2025-Q2', data: marks_2025_Q2 },
   
  
   ],

   akre: [
   
    { quarter: '2024-Q1', data: akre_2024_Q1 },
    { quarter: '2024-Q2', data: akre_2024_Q2 },
    { quarter: '2024-Q3', data: akre_2024_Q3 },
    { quarter: '2024-Q4', data: akre_2024_Q4 },
    { quarter: '2025-Q1', data: akre_2025_Q1 },
    { quarter: '2025-Q2', data: akre_2025_Q2 },
   
    // …
   ],
   olstein: [
   
    { quarter: '2024-Q1', data: olstein_2024_Q1 },
    { quarter: '2024-Q2', data: olstein_2024_Q2 },
    { quarter: '2024-Q3', data: olstein_2024_Q3 },
    { quarter: '2024-Q4', data: olstein_2024_Q4 },
    { quarter: '2025-Q1', data: olstein_2025_Q1 },
    { quarter: '2025-Q2', data: olstein_2025_Q2 },
   
    // …
   ],

   greenberg: [
   
    { quarter: '2024-Q1', data: greenberg_2024_Q1},
    { quarter: '2024-Q2', data: greenberg_2024_Q2},
    { quarter: '2024-Q3', data: greenberg_2024_Q3},
    { quarter: '2024-Q4', data: greenberg_2024_Q4},
    { quarter: '2025-Q1', data: greenberg_2025_Q1},
    { quarter: '2025-Q2', data: greenberg_2025_Q2},
    
   ],


   greenhaven: [
   
    { quarter: '2024-Q1', data: greenhaven_2024_Q1},
    { quarter: '2024-Q2', data: greenhaven_2024_Q2},
    { quarter: '2024-Q3', data: greenhaven_2024_Q3},
    { quarter: '2024-Q4', data: greenhaven_2024_Q4},
    { quarter: '2025-Q1', data: greenhaven_2025_Q1},
    { quarter: '2025-Q2', data: greenhaven_2025_Q2},
  
   ],
   gregalexander: [
   
    { quarter: '2024-Q1', data: gregalexander_2024_Q1},
    { quarter: '2024-Q2', data: gregalexander_2024_Q2},
    { quarter: '2024-Q3', data: gregalexander_2024_Q3},
    { quarter: '2024-Q4', data: gregalexander_2024_Q4},
    { quarter: '2025-Q1', data: gregalexander_2025_Q1},
    { quarter: '2025-Q2', data: gregalexander_2025_Q2}
  
   
   ],
   
   smith: [
    { quarter: '2024-Q4', data: smith_2024_Q4 },
    { quarter: '2025-Q1', data: smith_2025_Q1 },
    { quarter: '2025-Q2', data: smith_2025_Q2 },
   ],

   burry: [
    { quarter: '2024-Q3', data: burry_2024_Q3 },
    { quarter: '2024-Q4', data: burry_2024_Q4 },
    { quarter: '2025-Q1', data: burry_2025_Q1 },
    { quarter: '2025-Q2', data: burry_2025_Q2 },
   ],

    lilu: [
    { quarter: '2024-Q4', data: lilu_2024_Q4 },
    { quarter: '2025-Q1', data: lilu_2025_Q1 },
    { quarter: '2025-Q2', data: lilu_2025_Q2 },
   ],

   altarockpartners: [
    { quarter: '2024-Q4', data: altarockpartners_2024_Q4 },
    { quarter: '2025-Q1', data: altarockpartners_2025_Q1 },
    { quarter: '2025-Q2', data: altarockpartners_2025_Q2 },
   ],

   miller: [
    { quarter: '2024-Q4', data: miller_2024_Q4 },
    { quarter: '2025-Q1', data: miller_2025_Q1 },
    { quarter: '2025-Q2', data: miller_2025_Q2 },
   ],

   coleman: [
    { quarter: '2024-Q1', data: coleman_2024_Q1},
    { quarter: '2024-Q2', data: coleman_2024_Q2},
    { quarter: '2024-Q3', data: coleman_2024_Q3},
    { quarter: '2024-Q4', data: coleman_2024_Q4},
    { quarter: '2025-Q1', data: coleman_2025_Q1},
    { quarter: '2025-Q2', data: coleman_2025_Q2},
   ],

   gayner: [
    { quarter: '2024-Q1', data: gayner_2024_Q1},
    { quarter: '2024-Q2', data: gayner_2024_Q2 },
    { quarter: '2024-Q3', data: gayner_2024_Q3},
    { quarter: '2024-Q4', data: gayner_2024_Q4},
    { quarter: '2025-Q1', data: gayner_2025_Q1},
    { quarter: '2025-Q2', data: gayner_2025_Q2},
   ],

   ainslie: [
    { quarter: '2024-Q1', data: ainslie_2024_Q1},
    { quarter: '2024-Q2', data: ainslie_2024_Q2},
    { quarter: '2024-Q3', data: ainslie_2024_Q3},
    { quarter: '2024-Q4', data: ainslie_2024_Q4},
    { quarter: '2025-Q1', data: ainslie_2025_Q1},
    { quarter: '2025-Q2', data: ainslie_2025_Q2},
   ],

   tepper: [
    { quarter: '2024-Q1', data: tepper_2024_Q1},
    { quarter: '2024-Q2', data: tepper_2024_Q2},
    { quarter: '2024-Q3', data: tepper_2024_Q3},
    { quarter: '2024-Q4', data: tepper_2024_Q4},
    { quarter: '2025-Q1', data: tepper_2025_Q1},
    { quarter: '2025-Q2', data: tepper_2025_Q2},
   ],

   pabrai: [
    { quarter: '2024-Q1', data: pabrai_2024_Q1},
    { quarter: '2024-Q2', data: pabrai_2024_Q2 },
    { quarter: '2024-Q3', data: pabrai_2024_Q3},
    { quarter: '2024-Q4', data: pabrai_2024_Q4},
    { quarter: '2025-Q1', data: pabrai_2025_Q1},
    { quarter: '2025-Q2', data: pabrai_2025_Q2},
   ],

   einhorn: [
    { quarter: '2024-Q2', data: einhorn_2024_Q2},
    { quarter: '2024-Q3', data: einhorn_2024_Q3},
    { quarter: '2024-Q4', data: einhorn_2024_Q4},
    { quarter: '2025-Q1', data: einhorn_2025_Q1},
    { quarter: '2025-Q2', data: einhorn_2025_Q2},
   ],

   hohn: [
    { quarter: '2024-Q2', data: hohn_2024_Q2},
    { quarter: '2024-Q3', data: hohn_2024_Q3},
    { quarter: '2024-Q4', data: hohn_2024_Q4},
    { quarter: '2025-Q1', data: hohn_2025_Q1},
    { quarter: '2025-Q2', data: hohn_2025_Q2},
   ],

   yacktman: [
    { quarter: '2024-Q2', data: yacktman_2024_Q2 },
    { quarter: '2024-Q3', data: yacktman_2024_Q3},
    { quarter: '2024-Q4', data: yacktman_2024_Q4},
    { quarter: '2025-Q1', data: yacktman_2025_Q1},
    { quarter: '2025-Q1', data: yacktman_2025_Q2},
   ],

   polen: [
    { quarter: '2024-Q2', data: polen_2024_Q2 },
    { quarter: '2024-Q3', data: polen_2024_Q3},
    { quarter: '2024-Q4', data: polen_2024_Q4},
    { quarter: '2025-Q1', data: polen_2025_Q1},
    { quarter: '2025-Q1', data: polen_2025_Q2},
   ],

   viking: [
    { quarter: '2023-Q4', data: viking_2023_Q4 },
    { quarter: '2024-Q1', data: viking_2024_Q1 },
    { quarter: '2024-Q3', data: viking_2024_Q3},
    //{ quarter: '2024-Q4', data: polen_2024_Q4},
   // { quarter: '2025-Q1', data: polen_2025_Q1},
   // { quarter: '2025-Q1', data: polen_2025_Q2},
   ],

   bloomstran: [
    { quarter: '2024-Q2', data: bloomstran_2024_Q2},
    { quarter: '2024-Q3', data: bloomstran_2024_Q3},
    { quarter: '2024-Q4', data: bloomstran_2024_Q4},
    { quarter: '2025-Q1', data: bloomstran_2025_Q1},
    { quarter: '2025-Q2', data: bloomstran_2025_Q2},
   ],

   vinall: [
    { quarter: '2024-Q2', data: vinall_2024_Q2},
    { quarter: '2024-Q3', data: vinall_2024_Q3},
    { quarter: '2024-Q4', data: vinall_2024_Q4},
    { quarter: '2025-Q1', data: vinall_2025_Q1},
    { quarter: '2025-Q2', data: vinall_2025_Q2},
   ],

   cantillon: [
    { quarter: '2024-Q2', data: cantillon_2024_Q2},
    { quarter: '2024-Q3', data: cantillon_2024_Q3},
    { quarter: '2024-Q4', data: cantillon_2024_Q4},
    { quarter: '2025-Q1', data: cantillon_2025_Q1},
    { quarter: '2025-Q2', data: cantillon_2025_Q2},
   ],

   duan: [
    { quarter: '2024-Q2', data: duan_2024_Q2 },
    { quarter: '2024-Q3', data: duan_2024_Q3},
    { quarter: '2024-Q4', data: duan_2024_Q4},
    { quarter: '2025-Q1', data: duan_2025_Q1},
   ],

   mandel: [
    { quarter: '2024-Q2', data: mandel_2024_Q2},
    { quarter: '2024-Q3', data: mandel_2024_Q3},
    { quarter: '2024-Q4', data: mandel_2024_Q4},
    { quarter: '2025-Q1', data: mandel_2025_Q1},
    { quarter: '2025-Q2', data: mandel_2025_Q2},
   ],


   ellenbogen: [
    { quarter: '2024-Q2', data: ellenbogen_2024_Q2 },
    { quarter: '2024-Q3', data: ellenbogen_2024_Q3},
    { quarter: '2024-Q4', data: ellenbogen_2024_Q4},
    { quarter: '2025-Q1', data: ellenbogen_2025_Q1},
   ],

   jensen: [
    { quarter: '2024-Q2', data: jensen_2024_Q2},
    { quarter: '2024-Q3', data: jensen_2024_Q3},
    { quarter: '2024-Q4', data: jensen_2024_Q4},
    { quarter: '2025-Q1', data: jensen_2025_Q1},
    { quarter: '2025-Q2', data: jensen_2025_Q2},
   ],

   russo: [
    { quarter: '2024-Q2', data: russo_2024_Q2},
    { quarter: '2024-Q3', data: russo_2024_Q3},
    { quarter: '2024-Q4', data: russo_2024_Q4},
    { quarter: '2025-Q1', data: russo_2025_Q1},
    { quarter: '2025-Q2', data: russo_2025_Q2},
   ],

   armitage: [
    { quarter: '2024-Q2', data: armitage_2024_Q2 },
    { quarter: '2024-Q3', data: armitage_2024_Q3},
    { quarter: '2024-Q4', data: armitage_2024_Q4},
    { quarter: '2025-Q1', data: armitage_2025_Q1},
    { quarter: '2025-Q2', data: armitage_2025_Q2},
   ],


   icahn: [
    { quarter: '2024-Q2', data: icahn_2024_Q2},
    { quarter: '2024-Q3', data: icahn_2024_Q3},
    { quarter: '2024-Q4', data: icahn_2024_Q4},
    { quarter: '2025-Q1', data: icahn_2025_Q1},
    { quarter: '2025-Q2', data: icahn_2025_Q2},
   ],

   abrams: [
    { quarter: '2024-Q2', data: abrams_2024_Q2 },
    { quarter: '2024-Q3', data: abrams_2024_Q3},
    { quarter: '2024-Q4', data: abrams_2024_Q4},
    { quarter: '2025-Q1', data: abrams_2025_Q1},
    { quarter: '2025-Q2', data: abrams_2025_Q2},
   ],

   martin: [
    { quarter: '2024-Q2', data: martin_2024_Q2 },
    { quarter: '2024-Q3', data: martin_2024_Q3},
    { quarter: '2024-Q4', data: martin_2024_Q4},
    { quarter: '2025-Q1', data: martin_2025_Q1},
   ],

   train: [
    { quarter: '2024-Q2', data: train_2024_Q2},
    { quarter: '2024-Q3', data: train_2024_Q3},
    { quarter: '2024-Q4', data: train_2024_Q4},
    { quarter: '2025-Q1', data: train_2025_Q1},
    { quarter: '2025-Q2', data: train_2025_Q2},
   ],

   brenton: [
    { quarter: '2024-Q2', data: brenton_2024_Q2 },
    { quarter: '2024-Q3', data: brenton_2024_Q3},
    { quarter: '2024-Q4', data: brenton_2024_Q4},
    { quarter: '2025-Q1', data: brenton_2025_Q1},
   ],

   burn: [
    { quarter: '2024-Q2', data: burn_2024_Q2},
    { quarter: '2024-Q3', data: burn_2024_Q3},
    { quarter: '2024-Q4', data: burn_2024_Q4},
    { quarter: '2025-Q1', data: burn_2025_Q1},
    { quarter: '2025-Q2', data: burn_2025_Q2},
   ],

   dorsey: [
    { quarter: '2024-Q2', data: dorsey_2024_Q2},
    { quarter: '2024-Q3', data: dorsey_2024_Q3},
    { quarter: '2024-Q4', data: dorsey_2024_Q4},
    { quarter: '2025-Q1', data: dorsey_2025_Q1},
    { quarter: '2025-Q2', data: dorsey_2025_Q2},
   ],


   chou: [
    { quarter: '2024-Q2', data: chou_2024_Q2},
    { quarter: '2024-Q3', data: chou_2024_Q3},
    { quarter: '2024-Q4', data: chou_2024_Q4},
    { quarter: '2025-Q1', data: chou_2025_Q1},
    { quarter: '2025-Q2', data: chou_2025_Q2},
   ],

   lawrence: [
    { quarter: '2024-Q2', data: lawrence_2024_Q2},
    { quarter: '2024-Q3', data: lawrence_2024_Q3},
    { quarter: '2024-Q4', data: lawrence_2024_Q4},
    { quarter: '2025-Q1', data: lawrence_2025_Q1},
    { quarter: '2025-Q2', data: lawrence_2025_Q2},
   ],

   roepers: [
    { quarter: '2024-Q2', data: roepers_2024_Q2 },
    { quarter: '2024-Q3', data: roepers_2024_Q3},
    { quarter: '2024-Q4', data: roepers_2024_Q4},
    { quarter: '2025-Q1', data: roepers_2025_Q1},
    { quarter: '2025-Q2', data: roepers_2025_Q2},
   ],

   munger: [
    { quarter: '2024-Q2', data: munger_2024_Q2 },
   // { quarter: '2024-Q3', data: munger_2024_Q3},
    { quarter: '2024-Q4', data: munger_2024_Q4},
    { quarter: '2025-Q1', data: munger_2025_Q1},
   ],

   lou: [
    { quarter: '2024-Q2', data: lou_2024_Q2 },
    { quarter: '2024-Q3', data: lou_2024_Q3},
    { quarter: '2024-Q4', data: lou_2024_Q4},
    { quarter: '2025-Q1', data: lou_2025_Q1},
    { quarter: '2025-Q2', data: lou_2025_Q2},
   ],

   wyden: [
    { quarter: '2024-Q2', data: wyden_2024_Q2 },
    { quarter: '2024-Q3', data: wyden_2024_Q3},
    { quarter: '2024-Q4', data: wyden_2024_Q4},
    { quarter: '2025-Q1', data: wyden_2025_Q1},
   ],


   muhlenkamp: [
    { quarter: '2024-Q2', data: muhlenkamp_2024_Q2 },
    { quarter: '2024-Q3', data: muhlenkamp_2024_Q3},
    { quarter: '2024-Q4', data: muhlenkamp_2024_Q4},
    { quarter: '2025-Q1', data: muhlenkamp_2025_Q1},
   ],

   tarasoff: [
    { quarter: '2024-Q2', data: tarasoff_2024_Q2 },
    { quarter: '2024-Q3', data: tarasoff_2024_Q3},
    { quarter: '2024-Q4', data: tarasoff_2024_Q4},
    { quarter: '2025-Q1', data: tarasoff_2025_Q1},
    { quarter: '2025-Q2', data: tarasoff_2025_Q2},
   ],

   welling: [
    { quarter: '2024-Q2', data: welling_2024_Q2},
    { quarter: '2024-Q3', data: welling_2024_Q3},
    { quarter: '2024-Q4', data: welling_2024_Q4},
    { quarter: '2025-Q1', data: welling_2025_Q1},
    { quarter: '2025-Q2', data: welling_2025_Q2},
   ],

   rolfe: [
    { quarter: '2024-Q2', data: rolfe_2024_Q2},
    { quarter: '2024-Q3', data: rolfe_2024_Q3},
    { quarter: '2024-Q4', data: rolfe_2024_Q4},
    { quarter: '2025-Q1', data: rolfe_2025_Q1},
    { quarter: '2025-Q2', data: rolfe_2025_Q2},
   ],


   karr: [
    { quarter: '2024-Q2', data: karr_2024_Q2},
    { quarter: '2024-Q3', data: karr_2024_Q3},
    { quarter: '2024-Q4', data: karr_2024_Q4},
    { quarter: '2025-Q1', data: karr_2025_Q1},
   ],


   hong: [
    { quarter: '2024-Q2', data: hong_2024_Q2},
    { quarter: '2024-Q3', data: hong_2024_Q3},
    { quarter: '2024-Q4', data: hong_2024_Q4},
    { quarter: '2025-Q1', data: hong_2025_Q1},
    { quarter: '2025-Q2', data: hong_2025_Q2},
   ],

   bares: [
    { quarter: '2024-Q2', data: bares_2024_Q2},
    { quarter: '2024-Q3', data: bares_2024_Q3},
    { quarter: '2024-Q4', data: bares_2024_Q4},
    { quarter: '2025-Q1', data: bares_2025_Q1},
   ],


   berkowitz: [
    { quarter: '2024-Q2', data: berkowitz_2024_Q2},
    { quarter: '2024-Q3', data: berkowitz_2024_Q3},
    { quarter: '2024-Q4', data: berkowitz_2024_Q4},
    { quarter: '2025-Q1', data: berkowitz_2025_Q1},
    { quarter: '2025-Q2', data: berkowitz_2025_Q2},
   ],


   watsa: [
    { quarter: '2024-Q2', data: watsa_2024_Q2},
    { quarter: '2024-Q3', data: watsa_2024_Q3},
    { quarter: '2024-Q4', data: watsa_2024_Q4},
    { quarter: '2025-Q1', data: watsa_2025_Q1},
    { quarter: '2025-Q2', data: watsa_2025_Q2},
   ],

   sosin: [
    { quarter: '2024-Q2', data: sosin_2024_Q2},
    { quarter: '2024-Q3', data: sosin_2024_Q3},
    { quarter: '2024-Q4', data: sosin_2024_Q4},
    { quarter: '2025-Q1', data: sosin_2025_Q1},
    { quarter: '2025-Q2', data: sosin_2025_Q2},
   ],

   meritage: [
    { quarter: '2024-Q2', data: meritage_2024_Q2},
    { quarter: '2024-Q3', data: meritage_2024_Q3},
    { quarter: '2024-Q4', data: meritage_2024_Q4},
    { quarter: '2025-Q1', data: meritage_2025_Q1},
   ],

   ketterer: [
    { quarter: '2024-Q2', data: ketterer_2024_Q2},
    { quarter: '2024-Q3', data: ketterer_2024_Q3},
    { quarter: '2024-Q4', data: ketterer_2024_Q4},
    { quarter: '2025-Q1', data: ketterer_2025_Q1},
   ],

   vulcanvalue: [
    { quarter: '2024-Q2', data: vulcanvalue_2024_Q2},
    { quarter: '2024-Q3', data: vulcanvalue_2024_Q3},
    { quarter: '2024-Q4', data: vulcanvalue_2024_Q4},
    { quarter: '2025-Q1', data: vulcanvalue_2025_Q1},
   ],

   davis: [
    { quarter: '2024-Q2', data: davis_2024_Q2},
    { quarter: '2024-Q3', data: davis_2024_Q3},
    { quarter: '2024-Q4', data: davis_2024_Q4},
   { quarter: '2025-Q1', data: davis_2025_Q1},
   // { quarter: '2025-Q2', data: davis_2025_Q2},
   ],

   mairspower: [
    //{ quarter: '2024-Q2', data: mairspower_2024_Q2},
    //{ quarter: '2024-Q3', data: mairspower_2024_Q3},
    { quarter: '2024-Q4', data: mairspower_2024_Q4},
    { quarter: '2025-Q1', data: mairspower_2025_Q1},
    { quarter: '2025-Q2', data: mairspower_2025_Q2},
   ],


   nygren: [
    { quarter: '2024-Q2', data: nygren_2024_Q2},
    { quarter: '2024-Q3', data: nygren_2024_Q3},
    { quarter: '2024-Q4', data: nygren_2024_Q4},
    { quarter: '2025-Q1', data: nygren_2025_Q1},
    //{ quarter: '2025-Q2', data: nygren_2025_Q2},
   ],

   cunniff: [
    { quarter: '2024-Q2', data: cunniff_2024_Q2},
    { quarter: '2024-Q3', data: cunniff_2024_Q3},
    { quarter: '2024-Q4', data: cunniff_2024_Q4},
    { quarter: '2025-Q1', data: cunniff_2025_Q1},
    { quarter: '2025-Q2', data: cunniff_2025_Q2},
   ],

   hawkins: [
    { quarter: '2024-Q2', data: hawkins_2024_Q2},
    { quarter: '2024-Q3', data: hawkins_2024_Q3},
    { quarter: '2024-Q4', data: hawkins_2024_Q4},
    { quarter: '2025-Q1', data: hawkins_2025_Q1},
    //{ quarter: '2025-Q2', data: hawkins_2025_Q2},
   ],

   torray: [
    { quarter: '2024-Q2', data: torray_2024_Q2},
    { quarter: '2024-Q3', data: torray_2024_Q3},
    { quarter: '2024-Q4', data: torray_2024_Q4},
    { quarter: '2025-Q1', data: torray_2025_Q1},
    { quarter: '2025-Q2', data: torray_2025_Q2},
   ],

   rogers: [
    //{ quarter: '2024-Q2', data: rogers_2024_Q2},
    //{ quarter: '2024-Q3', data: rogers_2024_Q3},
   { quarter: '2024-Q4', data: rogers_2024_Q4},
    {quarter: '2025-Q1', data: rogers_2025_Q1},
    //{ quarter: '2025-Q2', data: rogers_2025_Q2},
   ],

   katz: [
    //{ quarter: '2024-Q2', data: rogers_2024_Q2},
    //{ quarter: '2024-Q3', data: rogers_2024_Q3},
   { quarter: '2024-Q4', data: rogers_2024_Q4},
    {quarter: '2025-Q1', data: katz_2025_Q1},
    //{ quarter: '2025-Q2', data: rogers_2025_Q2},
   ],

   klarman: [
    { quarter: '2024-Q2', data: klarman_2024_Q2},
    { quarter: '2024-Q3', data: klarman_2024_Q3},
    { quarter: '2024-Q4', data: klarman_2024_Q4},
    { quarter: '2025-Q1', data: klarman_2025_Q1},
    { quarter: '2025-Q2', data: klarman_2025_Q2},
   ],

   spier: [
    { quarter: '2024-Q2', data: spier_2024_Q2},
    { quarter: '2024-Q3', data: spier_2024_Q3},
    { quarter: '2024-Q4', data: spier_2024_Q4},
    { quarter: '2025-Q1', data: spier_2025_Q1},
    { quarter: '2025-Q2', data: spier_2025_Q2},
   ],

   triplefrond: [
    { quarter: '2024-Q2', data: triplefrond_2024_Q2},
    { quarter: '2024-Q3', data: triplefrond_2024_Q3},
    { quarter: '2024-Q4', data: triplefrond_2024_Q4},
    { quarter: '2025-Q1', data: triplefrond_2025_Q1},
    { quarter: '2025-Q2', data: triplefrond_2025_Q2},
   ],

   ubben: [
    { quarter: '2024-Q2', data: ubben_2024_Q2},
    { quarter: '2024-Q3', data: ubben_2024_Q3},
    { quarter: '2024-Q4', data: ubben_2024_Q4},
    { quarter: '2025-Q1', data: ubben_2025_Q1},
    { quarter: '2025-Q2', data: ubben_2025_Q2},
   ],

   donaldsmith: [
    { quarter: '2024-Q2', data: donaldsmith_2024_Q2},
    { quarter: '2024-Q3', data: donaldsmith_2024_Q3},
    { quarter: '2024-Q4', data: donaldsmith_2024_Q4},
    { quarter: '2025-Q1', data: donaldsmith_2025_Q1},
    { quarter: '2025-Q2', data: donaldsmith_2025_Q2},
   ],

   dodgecox: [
    { quarter: '2024-Q2', data: dodgecox_2024_Q2},
    { quarter: '2024-Q3', data: dodgecox_2024_Q3},
    { quarter: '2024-Q4', data: dodgecox_2024_Q4},
    { quarter: '2025-Q1', data: dodgecox_2025_Q1},
    { quarter: '2025-Q2', data: dodgecox_2025_Q2},
   ],

   whitman: [
    { quarter: '2024-Q2', data: whitman_2024_Q2},
    { quarter: '2024-Q3', data: whitman_2024_Q3},
    { quarter: '2024-Q4', data: whitman_2024_Q4},
    { quarter: '2025-Q1', data: whitman_2025_Q1},
    { quarter: '2025-Q2', data: whitman_2025_Q2},
   ],

   greenbrier: [
    { quarter: '2024-Q2', data: greenbrier_2024_Q2},
    { quarter: '2024-Q3', data: greenbrier_2024_Q3},
    { quarter: '2024-Q4', data: greenbrier_2024_Q4},
    { quarter: '2025-Q1', data: greenbrier_2025_Q1},
    { quarter: '2025-Q2', data: greenbrier_2025_Q2},
   ],

   peltz: [
    { quarter: '2024-Q2', data: peltz_2024_Q2},
    { quarter: '2024-Q3', data: peltz_2024_Q3},
    { quarter: '2024-Q4', data: peltz_2024_Q4},
    { quarter: '2025-Q1', data: peltz_2025_Q1},
    { quarter: '2025-Q2', data: peltz_2025_Q2},
   ],

   kantesaria: [
    { quarter: '2024-Q2', data: kantesaria_2024_Q2},
    { quarter: '2024-Q3', data: kantesaria_2024_Q3},
    { quarter: '2024-Q4', data: kantesaria_2024_Q4},
    { quarter: '2025-Q1', data: kantesaria_2025_Q1},
    { quarter: '2025-Q2', data: kantesaria_2025_Q2},
   ],



  // … alle weiteren Investoren analog …
}

export default holdingsHistory