import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import {
  Bell, FileText, MessageSquare, LayoutGrid, Plus, X, ChevronDown, Pencil,
  CheckCircle2, XCircle, ArrowUpCircle, UploadCloud, Send, Sparkles, Loader2, BarChart3, History, Users, IdCard, DoorOpen, Building2, Download, AlertTriangle, Info, Search
} from 'lucide-react';
import {
  createAgenda,
  createBlock,
  createProfessional,
  createUser,
  deleteAgenda,
  deleteBlock,
  deleteProfessional,
  demoLogin,
  fetchAgendas,
  fetchAgenda,
  fetchBootstrap,
  fetchCatalogActivities,
  fetchHealth,
  fetchMe,
  fetchNotifications,
  fetchReferencePerformance,
  fetchUsers,
  login,
  logout,
  confirmDraft,
  transitionAgenda,
  extendAgendaVigencia,
  fetchShiftRoster,
  createShiftRotation,
  updateShiftRotation,
  deleteShiftRotation,
  createShiftOverride,
  deleteShiftOverride,
  updateBlock,
  updateProfessional,
  uploadHrDotacion,
  fetchHrSummary,
  downloadResumenMinisterial,
  fetchHrPersonas,
  uploadPabellonPlan,
  fetchPabellonSummary,
  fetchPabellonCapacidad,
  updateAgendaFields,
  fetchCatalogProfessions,
  fetchCatalogSpecialties,
  previewAgendaExcel,
  applyAgendaExcel,
} from './src/lib/api.js';

/* ---------------------------------------------------------
   Taxonomía real: proceso -> actividades trazadoras
   (Atención Quirúrgica se diferencia además por pabellón)
--------------------------------------------------------- */

/* ---------------------------------------------------------
   Catálogo real de actividades por profesión y especialidad
--------------------------------------------------------- */

const SERVICIOS = ['Cardiología', 'Oftalmología', 'Traumatología', 'Medicina Interna', 'Otorrinolaringología', 'Ginecología', 'Genética Clínica', 'Endoscopia y Gastroenterología', 'Neonatología', 'Geriatría', 'Nefrología Adulto', 'Terapeuta Ocupacional', 'Cirugía Adulto', 'Cuidados Paliativos'];

// Catálogo real de actividades disponibles por profesión y especialidad (fuente: Listado_de_actividades.xlsx)
const PROCESOS_CAT = ["Ambulatorio", "Hospitalizado", "Quirúrgico", "Urgencia"];
const PROFESIONES_CAT = ["Médico(a) Cirujano(a)", "Enfermero(a)", "Matrón(a)", "Kinesiólogo(a)", "Fonoaudiólogo(a)", "Nutricionista", "Psicólogo(a) Clínica", "Psicopedagogo(a)", "Terapeuta Ocupacional"];
const ESPECIALIDADES_CAT = ["No Aplica", "CARDIOLOGÍA ADULTO", "OFTALMOLOGÍA", "TRAUMATOLOGÍA Y ORTOPEDIA ADULTO", "MEDICINA INTERNA", "OTORRINOLARINGOLOGÍA", "GINECOLOGÍA ADULTO"];
// [procesoIdx, profesionIdx, especialidadIdx, actividad, esClinica(1/0), tieneRendimiento(1/0)]
const CATALOGO_RAW = [
[0,0,1,"Administración de medicamentos",1,1],
[0,0,1,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,0,1,"Comité Clínico",1,0],
[0,0,1,"Comité de apoyo a la gestión",0,0],
[0,0,1,"Comité de programación",0,0],
[0,0,1,"Comité Oncológico",1,0],
[0,0,1,"Consulta Abreviada Médica Presencial",1,1],
[0,0,1,"Consulta Control de especialidad Presencial",1,1],
[0,0,1,"Consulta de ingreso a equipo PRAIS",1,1],
[0,0,1,"Consulta Nueva de especialidad Presencial",1,1],
[0,0,1,"Consultoría en salud presencial",1,1],
[0,0,1,"Contacto telefónico: Consulta Abreviada",1,1],
[0,0,1,"Contacto telefónico: Consulta Control",1,1],
[0,0,1,"Contacto telefónico: Consultoría",1,1],
[0,0,1,"Docencia e Investigación",1,0],
[0,0,1,"E.C.G. continuo (Holter)",1,0],
[0,0,1,"Educación Grupal",1,0],
[0,0,1,"Educación remota a usuario y/o cuidador",1,1],
[0,0,1,"Evaluación Intermedia remota",1,1],
[0,0,1,"Gestión de Casos",1,1],
[0,0,1,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,0,1,"Otras Actividades Clínicas",1,0],
[0,0,1,"Otras Actividades No Clínicas",0,0],
[0,0,1,"Otros procedimientos médicos",1,0],
[0,0,1,"Pertinencia (IC)",1,1],
[0,0,1,"Policlínico de choque",1,0],
[0,0,1,"Priorización y otorgamiento de modalidad de atención",1,1],
[0,0,1,"Procedimientos especialidad",1,0],
[0,0,1,"Procedimientos Imagenológicos (Médico)",1,1],
[0,0,1,"Reunión Clínica",1,0],
[0,0,1,"Reunión Técnica Administrativa",0,0],
[0,0,1,"Ronda otro establecimiento",1,0],
[0,0,1,"Telecomité",1,1],
[0,0,1,"Teleconsultoria OTRAS ESPECIALIDADES",1,1],
[0,0,1,"Telemedicina control (Teleinterconsulta asincrónica)",1,1],
[0,0,1,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,0,1,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[0,0,1,"Telemedicina hospitalizado (Teleinterconsulta Sincrónica hospitalizado)",1,1],
[0,0,1,"Telemedicina Nueva (Teleinterconsulta asincrónica)",1,1],
[0,0,1,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,0,1,"Telemedicina: Teleconsulta Control",1,1],
[0,0,1,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,0,1,"Telemedicina: Teleconsulta Nueva",1,1],
[0,0,1,"Test de Esfuerzo",1,1],
[0,0,1,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,0,1,"Trabajo sectorial de información y sensibilización",0,1],
[0,0,1,"Visita Domiciliaria",1,1],
[0,0,6,"Administración de medicamentos",1,1],
[0,0,6,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,0,6,"Comité Clínico",1,0],
[0,0,6,"Comité de apoyo a la gestión",0,0],
[0,0,6,"Comité de programación",0,0],
[0,0,6,"Comité Oncológico",1,0],
[0,0,6,"Consulta Abreviada Médica Presencial",1,1],
[0,0,6,"Consulta Control de especialidad Presencial",1,1],
[0,0,6,"Consulta de ingreso a equipo PRAIS",1,1],
[0,0,6,"Consulta Nueva de especialidad Presencial",1,1],
[0,0,6,"Consultoría en salud presencial",1,1],
[0,0,6,"Contacto telefónico: Consulta Abreviada",1,1],
[0,0,6,"Contacto telefónico: Consulta Control",1,1],
[0,0,6,"Docencia e Investigación",1,0],
[0,0,6,"Educación Grupal",1,0],
[0,0,6,"Educación remota a usuario y/o cuidador",1,1],
[0,0,6,"Gestión de Casos",1,1],
[0,0,6,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,0,6,"Otras Actividades Clínicas",1,0],
[0,0,6,"Otras Actividades No Clínicas",0,0],
[0,0,6,"Otros procedimientos médicos",1,0],
[0,0,6,"Pertinencia (IC)",1,1],
[0,0,6,"Policlínico de choque",1,0],
[0,0,6,"Priorización y otorgamiento de modalidad de atención",1,1],
[0,0,6,"Procedimientos especialidad",1,0],
[0,0,6,"Procedimientos Imagenológicos (Médico)",1,1],
[0,0,6,"Reunión Clínica",1,0],
[0,0,6,"Reunión Técnica Administrativa",0,0],
[0,0,6,"Ronda otro establecimiento",1,0],
[0,0,6,"Telecomité",1,1],
[0,0,6,"Teleconsultoria OTRAS ESPECIALIDADES",1,1],
[0,0,6,"Telemedicina control (Teleinterconsulta asincrónica)",1,1],
[0,0,6,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,0,6,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[0,0,6,"Telemedicina hospitalizado (Teleinterconsulta Sincrónica hospitalizado)",1,1],
[0,0,6,"Telemedicina Nueva (Teleinterconsulta asincrónica)",1,1],
[0,0,6,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,0,6,"Telemedicina: Teleconsulta Control",1,1],
[0,0,6,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,0,6,"Telemedicina: Teleconsulta Nueva",1,1],
[0,0,6,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,0,6,"Trabajo sectorial de información y sensibilización",0,1],
[0,0,6,"Visita Domiciliaria",1,1],
[0,0,4,"Administración de medicamentos",1,1],
[0,0,4,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,0,4,"Comité Clínico",1,0],
[0,0,4,"Comité de apoyo a la gestión",0,0],
[0,0,4,"Comité de programación",0,0],
[0,0,4,"Comité Oncológico",1,0],
[0,0,4,"Consulta Abreviada Médica Presencial",1,1],
[0,0,4,"Consulta Control de especialidad Presencial",1,1],
[0,0,4,"Consulta de ingreso a equipo PRAIS",1,1],
[0,0,4,"Consulta Nueva de especialidad Presencial",1,1],
[0,0,4,"Consultoría en salud presencial",1,1],
[0,0,4,"Contacto telefónico: Consulta Abreviada",1,1],
[0,0,4,"Contacto telefónico: Consulta Control",1,1],
[0,0,4,"Contacto telefónico: Consultoría",1,1],
[0,0,4,"Docencia e Investigación",1,0],
[0,0,4,"E.C.G. continuo (Holter)",1,0],
[0,0,4,"Educación Grupal",1,0],
[0,0,4,"Educación remota a usuario y/o cuidador",1,1],
[0,0,4,"Evaluación Intermedia remota",1,1],
[0,0,4,"Gestión de Casos",1,1],
[0,0,4,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,0,4,"Otras Actividades Clínicas",1,0],
[0,0,4,"Otras Actividades No Clínicas",0,0],
[0,0,4,"Otros procedimientos médicos",1,0],
[0,0,4,"Pertinencia (IC)",1,1],
[0,0,4,"Policlínico de choque",1,0],
[0,0,4,"Priorización y otorgamiento de modalidad de atención",1,1],
[0,0,4,"Procedimientos especialidad",1,0],
[0,0,4,"Procedimientos Imagenológicos (Médico)",1,1],
[0,0,4,"Reunión Clínica",1,0],
[0,0,4,"Reunión Técnica Administrativa",0,0],
[0,0,4,"Ronda otro establecimiento",1,0],
[0,0,4,"Telecomité",1,1],
[0,0,4,"Teleconsulta abreviada (Videollamada)",1,1],
[0,0,4,"Teleconsultoria OTRAS ESPECIALIDADES",1,1],
[0,0,4,"Telemedicina control (Teleinterconsulta asincrónica)",1,1],
[0,0,4,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,0,4,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[0,0,4,"Telemedicina hospitalizado (Teleinterconsulta Sincrónica hospitalizado)",1,1],
[0,0,4,"Telemedicina Nueva (Teleinterconsulta asincrónica)",1,1],
[0,0,4,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,0,4,"Telemedicina: Teleconsulta Control",1,1],
[0,0,4,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,0,4,"Telemedicina: Teleconsulta Nueva",1,1],
[0,0,4,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,0,4,"Trabajo sectorial de información y sensibilización",0,1],
[0,0,4,"Visita Domiciliaria",1,1],
[0,0,2,"Administración de medicamentos",1,1],
[0,0,2,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,0,2,"Comité Clínico",1,0],
[0,0,2,"Comité de apoyo a la gestión",0,0],
[0,0,2,"Comité de programación",0,0],
[0,0,2,"Comité Oncológico",1,0],
[0,0,2,"Consulta Abreviada Médica Presencial",1,1],
[0,0,2,"Consulta Control de especialidad Presencial",1,1],
[0,0,2,"Consulta de ingreso a equipo PRAIS",1,1],
[0,0,2,"Consulta Nueva de especialidad Presencial",1,1],
[0,0,2,"Consultoría en salud presencial",1,1],
[0,0,2,"Contacto telefónico: Consulta Abreviada",1,1],
[0,0,2,"Contacto telefónico: Consulta Control",1,1],
[0,0,2,"Docencia e Investigación",1,0],
[0,0,2,"Educación Grupal",1,0],
[0,0,2,"Educación remota a usuario y/o cuidador",1,1],
[0,0,2,"Gestión de Casos",1,1],
[0,0,2,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,0,2,"Infiltraciones (rehabilitación)",1,0],
[0,0,2,"Otras Actividades Clínicas",1,0],
[0,0,2,"Otras Actividades No Clínicas",0,0],
[0,0,2,"Otros procedimientos médicos",1,0],
[0,0,2,"Pertinencia (IC)",1,1],
[0,0,2,"Policlínico de choque",1,0],
[0,0,2,"Priorización y otorgamiento de modalidad de atención",1,1],
[0,0,2,"Procedimientos especialidad",1,0],
[0,0,2,"Procedimientos Imagenológicos (Médico)",1,1],
[0,0,2,"Reunión Clínica",1,0],
[0,0,2,"Reunión Técnica Administrativa",0,0],
[0,0,2,"Ronda otro establecimiento",1,0],
[0,0,2,"Telecomité",1,1],
[0,0,2,"Teleconsultoria OTRAS ESPECIALIDADES",1,1],
[0,0,2,"Telemedicina control (Teleinterconsulta asincrónica)",1,1],
[0,0,2,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,0,2,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[0,0,2,"Telemedicina hospitalizado (Teleinterconsulta Sincrónica hospitalizado)",1,1],
[0,0,2,"Telemedicina Nueva (Teleinterconsulta asincrónica)",1,1],
[0,0,2,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,0,2,"Telemedicina: Teleconsulta Control",1,1],
[0,0,2,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,0,2,"Telemedicina: Teleconsulta Nueva",1,1],
[0,0,2,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,0,2,"Trabajo sectorial de información y sensibilización",0,1],
[0,0,2,"Visita Domiciliaria",1,1],
[0,0,5,"Administración de medicamentos",1,1],
[0,0,5,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,0,5,"Comité Clínico",1,0],
[0,0,5,"Comité de apoyo a la gestión",0,0],
[0,0,5,"Comité de programación",0,0],
[0,0,5,"Comité Oncológico",1,0],
[0,0,5,"Consulta Abreviada Médica Presencial",1,1],
[0,0,5,"Consulta Control de especialidad Presencial",1,1],
[0,0,5,"Consulta de ingreso a equipo PRAIS",1,1],
[0,0,5,"Consulta Nueva de especialidad Presencial",1,1],
[0,0,5,"Consultoría en salud presencial",1,1],
[0,0,5,"Contacto telefónico: Consulta Abreviada",1,1],
[0,0,5,"Contacto telefónico: Consulta Control",1,1],
[0,0,5,"Docencia e Investigación",1,0],
[0,0,5,"Educación Grupal",1,0],
[0,0,5,"Educación remota a usuario y/o cuidador",1,1],
[0,0,5,"Gestión de Casos",1,1],
[0,0,5,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,0,5,"Infiltraciones (rehabilitación)",1,0],
[0,0,5,"Otras Actividades Clínicas",1,0],
[0,0,5,"Otras Actividades No Clínicas",0,0],
[0,0,5,"Otros procedimientos médicos",1,0],
[0,0,5,"Pertinencia (IC)",1,1],
[0,0,5,"Policlínico de choque",1,0],
[0,0,5,"Priorización y otorgamiento de modalidad de atención",1,1],
[0,0,5,"Procedimientos especialidad",1,0],
[0,0,5,"Reunión Clínica",1,0],
[0,0,5,"Reunión Técnica Administrativa",0,0],
[0,0,5,"Ronda otro establecimiento",1,0],
[0,0,5,"Telecomité",1,1],
[0,0,5,"Teleconsultoria OTRAS ESPECIALIDADES",1,1],
[0,0,5,"Telemedicina control (Teleinterconsulta asincrónica)",1,1],
[0,0,5,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,0,5,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[0,0,5,"Telemedicina hospitalizado (Teleinterconsulta Sincrónica hospitalizado)",1,1],
[0,0,5,"Telemedicina Nueva (Teleinterconsulta asincrónica)",1,1],
[0,0,5,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,0,5,"Telemedicina: Teleconsulta Control",1,1],
[0,0,5,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,0,5,"Telemedicina: Teleconsulta Nueva",1,1],
[0,0,5,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,0,5,"Trabajo sectorial de información y sensibilización",0,1],
[0,0,5,"Visita Domiciliaria",1,1],
[0,0,3,"Administración de medicamentos",1,1],
[0,0,3,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,0,3,"Comité Clínico",1,0],
[0,0,3,"Comité de apoyo a la gestión",0,0],
[0,0,3,"Comité de programación",0,0],
[0,0,3,"Comité Oncológico",1,0],
[0,0,3,"Consulta Abreviada Médica Presencial",1,1],
[0,0,3,"Consulta Control de especialidad Presencial",1,1],
[0,0,3,"Consulta de ingreso a equipo PRAIS",1,1],
[0,0,3,"Consulta Nueva de especialidad Presencial",1,1],
[0,0,3,"Consultoría en salud presencial",1,1],
[0,0,3,"Contacto telefónico: Consulta Abreviada",1,1],
[0,0,3,"Contacto telefónico: Consulta Control",1,1],
[0,0,3,"Docencia e Investigación",1,0],
[0,0,3,"Educación Grupal",1,0],
[0,0,3,"Educación remota a usuario y/o cuidador",1,1],
[0,0,3,"Gestión de Casos",1,1],
[0,0,3,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,0,3,"Infiltraciones (rehabilitación)",1,0],
[0,0,3,"Otras Actividades Clínicas",1,0],
[0,0,3,"Otras Actividades No Clínicas",0,0],
[0,0,3,"Otros procedimientos médicos",1,0],
[0,0,3,"Pertinencia (IC)",1,1],
[0,0,3,"Policlínico de choque",1,0],
[0,0,3,"Priorización y otorgamiento de modalidad de atención",1,1],
[0,0,3,"Procedimientos especialidad",1,0],
[0,0,3,"Procedimientos Imagenológicos (Médico)",1,1],
[0,0,3,"Reunión Clínica",1,0],
[0,0,3,"Reunión Técnica Administrativa",0,0],
[0,0,3,"Ronda otro establecimiento",1,0],
[0,0,3,"Telecomité",1,1],
[0,0,3,"Teleconsultoria OTRAS ESPECIALIDADES",1,1],
[0,0,3,"Telemedicina control (Teleinterconsulta asincrónica)",1,1],
[0,0,3,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,0,3,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[0,0,3,"Telemedicina hospitalizado (Teleinterconsulta Sincrónica hospitalizado)",1,1],
[0,0,3,"Telemedicina Nueva (Teleinterconsulta asincrónica)",1,1],
[0,0,3,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,0,3,"Telemedicina: Teleconsulta Control",1,1],
[0,0,3,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,0,3,"Telemedicina: Teleconsulta Nueva",1,1],
[0,0,3,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,0,3,"Trabajo sectorial de información y sensibilización",0,1],
[0,0,3,"Visita Domiciliaria",1,1],
[1,0,6,"Administración de medicamentos",1,1],
[1,0,6,"Comité Clínico",1,0],
[1,0,6,"Comité Oncológico",1,0],
[1,0,6,"Docencia e Investigación",1,0],
[1,0,6,"Educación Grupal",1,0],
[1,0,6,"Gestión de camas",1,0],
[1,0,6,"Gestión de Casos",1,0],
[1,0,6,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,0,6,"Otras Actividades Clínicas",1,0],
[1,0,6,"Otras Actividades No Clínicas",0,0],
[1,0,6,"Otros procedimientos médicos",1,0],
[1,0,6,"Procedimientos especialidad",1,0],
[1,0,6,"Procedimientos Imagenológicos (Médico)",1,1],
[1,0,6,"Reunión Clínica",1,0],
[1,0,6,"Reunión Técnica Administrativa",0,0],
[1,0,6,"Telecomité",1,1],
[1,0,4,"Administración de medicamentos",1,1],
[1,0,4,"Comité Clínico",1,0],
[1,0,4,"Comité Oncológico",1,0],
[1,0,4,"Docencia e Investigación",1,0],
[1,0,4,"Educación Grupal",1,0],
[1,0,4,"Gestión de camas",1,0],
[1,0,4,"Gestión de Casos",1,0],
[1,0,4,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,0,4,"Otras Actividades Clínicas",1,0],
[1,0,4,"Otras Actividades No Clínicas",0,0],
[1,0,4,"Otros procedimientos médicos",1,0],
[1,0,4,"Procedimientos especialidad",1,0],
[1,0,4,"Procedimientos Imagenológicos (Médico)",1,1],
[1,0,4,"Reunión Clínica",1,0],
[1,0,4,"Reunión Técnica Administrativa",0,0],
[1,0,4,"Telecomité",1,1],
[1,0,2,"Administración de medicamentos",1,1],
[1,0,2,"Comité Clínico",1,0],
[1,0,2,"Comité Oncológico",1,0],
[1,0,2,"Docencia e Investigación",1,0],
[1,0,2,"Educación Grupal",1,0],
[1,0,2,"Gestión de camas",1,0],
[1,0,2,"Gestión de Casos",1,0],
[1,0,2,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,0,2,"Infiltraciones (rehabilitación)",1,0],
[1,0,2,"Otras Actividades Clínicas",1,0],
[1,0,2,"Otras Actividades No Clínicas",0,0],
[1,0,2,"Otros procedimientos médicos",1,0],
[1,0,2,"Procedimientos especialidad",1,0],
[1,0,2,"Procedimientos Imagenológicos (Médico)",1,1],
[1,0,2,"Reunión Clínica",1,0],
[1,0,2,"Reunión Técnica Administrativa",0,0],
[1,0,2,"Telecomité",1,1],
[1,0,5,"Administración de medicamentos",1,1],
[1,0,5,"Comité Clínico",1,0],
[1,0,5,"Comité Oncológico",1,0],
[1,0,5,"Docencia e Investigación",1,0],
[1,0,5,"Educación Grupal",1,0],
[1,0,5,"Gestión de camas",1,0],
[1,0,5,"Gestión de Casos",1,0],
[1,0,5,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,0,5,"Infiltraciones (rehabilitación)",1,0],
[1,0,5,"Otras Actividades Clínicas",1,0],
[1,0,5,"Otras Actividades No Clínicas",0,0],
[1,0,5,"Otros procedimientos médicos",1,0],
[1,0,5,"Procedimientos especialidad",1,0],
[1,0,5,"Reunión Clínica",1,0],
[1,0,5,"Reunión Técnica Administrativa",0,0],
[1,0,5,"Telecomité",1,1],
[1,0,3,"Administración de medicamentos",1,1],
[1,0,3,"Comité Clínico",1,0],
[1,0,3,"Comité Oncológico",1,0],
[1,0,3,"Docencia e Investigación",1,0],
[1,0,3,"Educación Grupal",1,0],
[1,0,3,"Gestión de camas",1,0],
[1,0,3,"Gestión de Casos",1,0],
[1,0,3,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,0,3,"Infiltraciones (rehabilitación)",1,0],
[1,0,3,"Otras Actividades Clínicas",1,0],
[1,0,3,"Otras Actividades No Clínicas",0,0],
[1,0,3,"Otros procedimientos médicos",1,0],
[1,0,3,"Procedimientos especialidad",1,0],
[1,0,3,"Procedimientos Imagenológicos (Médico)",1,1],
[1,0,3,"Reunión Clínica",1,0],
[1,0,3,"Reunión Técnica Administrativa",0,0],
[1,0,3,"Telecomité",1,1],
[2,0,6,"Administración de medicamentos",1,1],
[2,0,6,"Cistoscopia y/o uretrocistoscopia y/o uretroscopia",1,0],
[2,0,6,"Docencia e Investigación",1,0],
[2,0,6,"Gestión de Casos",1,0],
[2,0,6,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[2,0,6,"Otras Actividades Clínicas",1,0],
[2,0,6,"Otras Actividades No Clínicas",0,0],
[2,0,6,"Otros procedimientos médicos",1,0],
[2,0,6,"Pabellon Cirugía Mayor",1,1],
[2,0,6,"Pabellon Cirugía Mayor Ambulatoria",1,0],
[2,0,6,"Pabellon Cirugía Menor",1,0],
[2,0,6,"Pabellon Cirugía Obstétrica",1,0],
[2,0,6,"Procedimientos especialidad",1,0],
[2,0,6,"Procedimientos Imagenológicos (Médico)",1,1],
[2,0,6,"Reunión Clínica",1,0],
[2,0,6,"Reunión Técnica Administrativa",0,0],
[2,0,2,"Administración de medicamentos",1,1],
[2,0,2,"Docencia e Investigación",1,0],
[2,0,2,"Gestión de Casos",1,0],
[2,0,2,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[2,0,2,"Otras Actividades Clínicas",1,0],
[2,0,2,"Otras Actividades No Clínicas",0,0],
[2,0,2,"Otros procedimientos médicos",1,0],
[2,0,2,"Pabellon Cirugía Mayor",1,1],
[2,0,2,"Pabellon Cirugía Mayor Ambulatoria",1,0],
[2,0,2,"Pabellon Cirugía Menor",1,0],
[2,0,2,"Procedimientos especialidad",1,0],
[2,0,2,"Procedimientos Imagenológicos (Médico)",1,1],
[2,0,2,"Reunión Clínica",1,0],
[2,0,2,"Reunión Técnica Administrativa",0,0],
[2,0,5,"Administración de medicamentos",1,1],
[2,0,5,"Docencia e Investigación",1,0],
[2,0,5,"Gestión de Casos",1,0],
[2,0,5,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[2,0,5,"Nasofaringolaringofibroscopia",1,0],
[2,0,5,"Otras Actividades Clínicas",1,0],
[2,0,5,"Otras Actividades No Clínicas",0,0],
[2,0,5,"Otros procedimientos médicos",1,0],
[2,0,5,"Pabellon Cirugía Mayor",1,1],
[2,0,5,"Pabellon Cirugía Mayor Ambulatoria",1,0],
[2,0,5,"Pabellon Cirugía Menor",1,0],
[2,0,5,"Procedimientos especialidad",1,0],
[2,0,5,"Procedimientos Imagenológicos (Médico)",1,1],
[2,0,5,"Reunión Clínica",1,0],
[2,0,5,"Reunión Técnica Administrativa",0,0],
[2,0,3,"Administración de medicamentos",1,1],
[2,0,3,"Docencia e Investigación",1,0],
[2,0,3,"Gestión de Casos",1,0],
[2,0,3,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[2,0,3,"Nasofaringolaringofibroscopia",1,0],
[2,0,3,"Otras Actividades Clínicas",1,0],
[2,0,3,"Otras Actividades No Clínicas",0,0],
[2,0,3,"Otros procedimientos médicos",1,0],
[2,0,3,"Pabellon Cirugía Mayor",1,1],
[2,0,3,"Pabellon Cirugía Mayor Ambulatoria",1,0],
[2,0,3,"Pabellon Cirugía Menor",1,0],
[2,0,3,"Procedimientos especialidad",1,0],
[2,0,3,"Procedimientos Imagenológicos (Médico)",1,1],
[2,0,3,"Reunión Clínica",1,0],
[2,0,3,"Reunión Técnica Administrativa",0,0],
[3,0,1,"Administración de medicamentos",1,0],
[3,0,1,"Docencia e Investigación",1,0],
[3,0,1,"Ecocardiograma con/sin Doppler",1,0],
[3,0,1,"Gestión de camas",1,0],
[3,0,1,"Gestión de Casos",1,0],
[3,0,1,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,0,1,"Otras Actividades Clínicas",1,0],
[3,0,1,"Otras Actividades No Clínicas",0,0],
[3,0,1,"Otros procedimientos médicos",1,0],
[3,0,1,"Pabellon Cirugía Urgencia",1,0],
[3,0,1,"Procedimientos especialidad",1,0],
[3,0,1,"Procedimientos Imagenológicos (Médico)",1,0],
[3,0,1,"Reunión Clínica",1,0],
[3,0,1,"Reunión Técnica Administrativa",0,0],
[3,0,1,"Triage",1,1],
[3,0,6,"Administración de medicamentos",1,0],
[3,0,6,"Docencia e Investigación",1,0],
[3,0,6,"Gestión de camas",1,0],
[3,0,6,"Gestión de Casos",1,0],
[3,0,6,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,0,6,"Otras Actividades Clínicas",1,0],
[3,0,6,"Otras Actividades No Clínicas",0,0],
[3,0,6,"Otros procedimientos médicos",1,0],
[3,0,6,"Pabellon Cirugía Urgencia",1,0],
[3,0,6,"Procedimientos especialidad",1,0],
[3,0,6,"Procedimientos Imagenológicos (Médico)",1,0],
[3,0,6,"Reunión Clínica",1,0],
[3,0,6,"Reunión Técnica Administrativa",0,0],
[3,0,6,"Triage",1,1],
[3,0,4,"Administración de medicamentos",1,0],
[3,0,4,"Docencia e Investigación",1,0],
[3,0,4,"Ecocardiograma con/sin Doppler",1,0],
[3,0,4,"Gestión de camas",1,0],
[3,0,4,"Gestión de Casos",1,0],
[3,0,4,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,0,4,"Otras Actividades Clínicas",1,0],
[3,0,4,"Otras Actividades No Clínicas",0,0],
[3,0,4,"Otros procedimientos médicos",1,0],
[3,0,4,"Pabellon Cirugía Urgencia",1,0],
[3,0,4,"Procedimientos especialidad",1,0],
[3,0,4,"Procedimientos Imagenológicos (Médico)",1,0],
[3,0,4,"Reunión Clínica",1,0],
[3,0,4,"Reunión Técnica Administrativa",0,0],
[3,0,4,"Triage",1,1],
[3,0,2,"Administración de medicamentos",1,0],
[3,0,2,"Docencia e Investigación",1,0],
[3,0,2,"Gestión de camas",1,0],
[3,0,2,"Gestión de Casos",1,0],
[3,0,2,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,0,2,"Otras Actividades Clínicas",1,0],
[3,0,2,"Otras Actividades No Clínicas",0,0],
[3,0,2,"Otros procedimientos médicos",1,0],
[3,0,2,"Pabellon Cirugía Urgencia",1,0],
[3,0,2,"Procedimientos especialidad",1,0],
[3,0,2,"Procedimientos Imagenológicos (Médico)",1,0],
[3,0,2,"Reunión Clínica",1,0],
[3,0,2,"Reunión Técnica Administrativa",0,0],
[3,0,2,"Triage",1,1],
[3,0,5,"Administración de medicamentos",1,0],
[3,0,5,"Docencia e Investigación",1,0],
[3,0,5,"Gestión de camas",1,0],
[3,0,5,"Gestión de Casos",1,0],
[3,0,5,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,0,5,"Otras Actividades Clínicas",1,0],
[3,0,5,"Otras Actividades No Clínicas",0,0],
[3,0,5,"Otros procedimientos médicos",1,0],
[3,0,5,"Pabellon Cirugía Urgencia",1,0],
[3,0,5,"Procedimientos especialidad",1,0],
[3,0,5,"Reunión Clínica",1,0],
[3,0,5,"Reunión Técnica Administrativa",0,0],
[3,0,5,"Triage",1,1],
[3,0,3,"Administración de medicamentos",1,0],
[3,0,3,"Docencia e Investigación",1,0],
[3,0,3,"Gestión de camas",1,0],
[3,0,3,"Gestión de Casos",1,0],
[3,0,3,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,0,3,"Otras Actividades Clínicas",1,0],
[3,0,3,"Otras Actividades No Clínicas",0,0],
[3,0,3,"Otros procedimientos médicos",1,0],
[3,0,3,"Pabellon Cirugía Urgencia",1,0],
[3,0,3,"Procedimientos especialidad",1,0],
[3,0,3,"Procedimientos Imagenológicos (Médico)",1,0],
[3,0,3,"Reunión Clínica",1,0],
[3,0,3,"Reunión Técnica Administrativa",0,0],
[3,0,3,"Triage",1,1],
[1,0,1,"Administración de medicamentos",1,1],
[1,0,1,"Comité Clínico",1,0],
[1,0,1,"Comité Oncológico",1,0],
[1,0,1,"Docencia e Investigación",1,0],
[1,0,1,"Educación Grupal",1,0],
[1,0,1,"Gestión de camas",1,0],
[1,0,1,"Gestión de Casos",1,0],
[1,0,1,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,0,1,"Otras Actividades Clínicas",1,0],
[1,0,1,"Otras Actividades No Clínicas",0,0],
[1,0,1,"Otros procedimientos médicos",1,0],
[1,0,1,"Procedimientos especialidad",1,0],
[1,0,1,"Procedimientos Imagenológicos (Médico)",1,1],
[1,0,1,"Reunión Clínica",1,0],
[1,0,1,"Reunión Técnica Administrativa",0,0],
[1,0,1,"Telecomité",1,1],
[2,0,1,"Administración de medicamentos",1,1],
[2,0,1,"Docencia e Investigación",1,0],
[2,0,1,"Gestión de Casos",1,0],
[2,0,1,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[2,0,1,"Nasofaringolaringofibroscopia",1,0],
[2,0,1,"Otras Actividades Clínicas",1,0],
[2,0,1,"Otras Actividades No Clínicas",0,0],
[2,0,1,"Otros procedimientos médicos",1,0],
[2,0,1,"Pabellon Cirugía Mayor",1,1],
[2,0,1,"Pabellon Cirugía Mayor Ambulatoria",1,0],
[2,0,1,"Pabellon Cirugía Menor",1,0],
[2,0,1,"Procedimientos especialidad",1,0],
[2,0,1,"Procedimientos Imagenológicos (Médico)",1,1],
[2,0,1,"Reunión Clínica",1,0],
[2,0,1,"Reunión Técnica Administrativa",0,0],
[0,0,1,"Ecocardiograma con/sin Doppler",1,1],
[0,0,4,"Actividades de cuidado del equipo (SM)",0,0],
[0,0,5,"Nasofaringolaringofibroscopia",1,1],
[0,0,3,"Nasofaringolaringofibroscopia",1,1],
[0,0,1,"Nasofaringolaringofibroscopia",1,1],
[1,0,4,"Consulta Control Hospital de Día y UHCIP (SM)",1,1],
[1,0,4,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,1],
[3,0,1,"Atención de Servicio de Urgencia C1-C2",1,1],
[3,0,4,"Atención de Servicio de Urgencia C1-C2",1,1],
[3,0,2,"Atención de Servicio de Urgencia C1-C2",1,1],
[3,0,5,"Atención de Servicio de Urgencia C1-C2",1,1],
[3,0,3,"Atención de Servicio de Urgencia C1-C2",1,1],
[3,0,1,"Atención de Servicio de Urgencia C3",1,1],
[3,0,4,"Atención de Servicio de Urgencia C3",1,1],
[3,0,2,"Atención de Servicio de Urgencia C3",1,1],
[3,0,5,"Atención de Servicio de Urgencia C3",1,1],
[3,0,3,"Atención de Servicio de Urgencia C3",1,1],
[3,0,1,"Atención de Servicio de Urgencia C4-C5",1,1],
[3,0,4,"Atención de Servicio de Urgencia C4-C5",1,1],
[3,0,2,"Atención de Servicio de Urgencia C4-C5",1,1],
[3,0,5,"Atención de Servicio de Urgencia C4-C5",1,1],
[3,0,3,"Atención de Servicio de Urgencia C4-C5",1,1],
[1,0,6,"Egresos cama básica pediátrica",1,1],
[1,0,6,"Egresos cama media pediátrica",1,1],
[1,0,6,"Egresos cama UCI pediátrica",1,1],
[1,0,6,"Egresos cama UTI pediátrica",1,1],
[1,0,6,"Egresos cama básica Neo",1,1],
[1,0,6,"Egresos cama UTI Neo",1,1],
[1,0,6,"Egresos cama UCI Neo",1,1],
[1,0,6,"Egresos cama UTI Adulto",1,1],
[1,0,6,"Egresos cama UCI Adulto",1,1],
[1,0,6,"Egresos cama media Adulto",1,1],
[1,0,6,"Egresos cama básica Adulto",1,1],
[1,0,6,"Egresos cama Psiquiátrica",1,1],
[1,0,4,"Egresos cama básica pediátrica",1,1],
[1,0,4,"Egresos cama media pediátrica",1,1],
[1,0,4,"Egresos cama UCI pediátrica",1,1],
[1,0,4,"Egresos cama UTI pediátrica",1,1],
[1,0,4,"Egresos cama básica Neo",1,1],
[1,0,4,"Egresos cama UTI Neo",1,1],
[1,0,4,"Egresos cama UCI Neo",1,1],
[1,0,4,"Egresos cama UTI Adulto",1,1],
[1,0,4,"Egresos cama UCI Adulto",1,1],
[1,0,4,"Egresos cama media Adulto",1,1],
[1,0,4,"Egresos cama básica Adulto",1,1],
[1,0,4,"Egresos cama Psiquiátrica",1,1],
[1,0,2,"Egresos cama básica pediátrica",1,1],
[1,0,2,"Egresos cama media pediátrica",1,1],
[1,0,2,"Egresos cama UCI pediátrica",1,1],
[1,0,2,"Egresos cama UTI pediátrica",1,1],
[1,0,2,"Egresos cama básica Neo",1,1],
[1,0,2,"Egresos cama UTI Neo",1,1],
[1,0,2,"Egresos cama UCI Neo",1,1],
[1,0,2,"Egresos cama UTI Adulto",1,1],
[1,0,2,"Egresos cama UCI Adulto",1,1],
[1,0,2,"Egresos cama media Adulto",1,1],
[1,0,2,"Egresos cama básica Adulto",1,1],
[1,0,2,"Egresos cama Psiquiátrica",1,1],
[1,0,5,"Egresos cama básica pediátrica",1,1],
[1,0,5,"Egresos cama media pediátrica",1,1],
[1,0,5,"Egresos cama UCI pediátrica",1,1],
[1,0,5,"Egresos cama UTI pediátrica",1,1],
[1,0,5,"Egresos cama básica Neo",1,1],
[1,0,5,"Egresos cama UTI Neo",1,1],
[1,0,5,"Egresos cama UCI Neo",1,1],
[1,0,5,"Egresos cama UTI Adulto",1,1],
[1,0,5,"Egresos cama UCI Adulto",1,1],
[1,0,5,"Egresos cama media Adulto",1,1],
[1,0,5,"Egresos cama básica Adulto",1,1],
[1,0,5,"Egresos cama Psiquiátrica",1,1],
[1,0,3,"Egresos cama básica pediátrica",1,1],
[1,0,3,"Egresos cama media pediátrica",1,1],
[1,0,3,"Egresos cama UCI pediátrica",1,1],
[1,0,3,"Egresos cama UTI pediátrica",1,1],
[1,0,3,"Egresos cama básica Neo",1,1],
[1,0,3,"Egresos cama UTI Neo",1,1],
[1,0,3,"Egresos cama UCI Neo",1,1],
[1,0,3,"Egresos cama UTI Adulto",1,1],
[1,0,3,"Egresos cama UCI Adulto",1,1],
[1,0,3,"Egresos cama media Adulto",1,1],
[1,0,3,"Egresos cama básica Adulto",1,1],
[1,0,3,"Egresos cama Psiquiátrica",1,1],
[1,0,1,"Egresos cama básica pediátrica",1,1],
[1,0,1,"Egresos cama media pediátrica",1,1],
[1,0,1,"Egresos cama UCI pediátrica",1,1],
[1,0,1,"Egresos cama UTI pediátrica",1,1],
[1,0,1,"Egresos cama básica Neo",1,1],
[1,0,1,"Egresos cama UTI Neo",1,1],
[1,0,1,"Egresos cama UCI Neo",1,1],
[1,0,1,"Egresos cama UTI Adulto",1,1],
[1,0,1,"Egresos cama UCI Adulto",1,1],
[1,0,1,"Egresos cama media Adulto",1,1],
[1,0,1,"Egresos cama básica Adulto",1,1],
[1,0,1,"Egresos cama Psiquiátrica",1,1],
[0,0,6,"Egresos cama básica pediátrica",1,1],
[0,0,6,"Egresos cama media pediátrica",1,1],
[0,0,6,"Egresos cama UCI pediátrica",1,1],
[0,0,6,"Egresos cama UTI pediátrica",1,1],
[0,0,6,"Egresos cama básica Neo",1,1],
[0,0,6,"Egresos cama UTI Neo",1,1],
[0,0,6,"Egresos cama UCI Neo",1,1],
[0,0,6,"Egresos cama UTI Adulto",1,1],
[0,0,6,"Egresos cama UCI Adulto",1,1],
[0,0,6,"Egresos cama media Adulto",1,1],
[0,0,6,"Egresos cama básica Adulto",1,1],
[0,0,6,"Egresos cama Psiquiátrica",1,1],
[0,0,4,"Egresos cama básica pediátrica",1,1],
[0,0,4,"Egresos cama media pediátrica",1,1],
[0,0,4,"Egresos cama UCI pediátrica",1,1],
[0,0,4,"Egresos cama UTI pediátrica",1,1],
[0,0,4,"Egresos cama básica Neo",1,1],
[0,0,4,"Egresos cama UTI Neo",1,1],
[0,0,4,"Egresos cama UCI Neo",1,1],
[0,0,4,"Egresos cama UTI Adulto",1,1],
[0,0,4,"Egresos cama UCI Adulto",1,1],
[0,0,4,"Egresos cama media Adulto",1,1],
[0,0,4,"Egresos cama básica Adulto",1,1],
[0,0,4,"Egresos cama Psiquiátrica",1,1],
[0,0,2,"Egresos cama básica pediátrica",1,1],
[0,0,2,"Egresos cama media pediátrica",1,1],
[0,0,2,"Egresos cama UCI pediátrica",1,1],
[0,0,2,"Egresos cama UTI pediátrica",1,1],
[0,0,2,"Egresos cama básica Neo",1,1],
[0,0,2,"Egresos cama UTI Neo",1,1],
[0,0,2,"Egresos cama UCI Neo",1,1],
[0,0,2,"Egresos cama UTI Adulto",1,1],
[0,0,2,"Egresos cama UCI Adulto",1,1],
[0,0,2,"Egresos cama media Adulto",1,1],
[0,0,2,"Egresos cama básica Adulto",1,1],
[0,0,2,"Egresos cama Psiquiátrica",1,1],
[0,0,5,"Egresos cama básica pediátrica",1,1],
[0,0,5,"Egresos cama media pediátrica",1,1],
[0,0,5,"Egresos cama UCI pediátrica",1,1],
[0,0,5,"Egresos cama UTI pediátrica",1,1],
[0,0,5,"Egresos cama básica Neo",1,1],
[0,0,5,"Egresos cama UTI Neo",1,1],
[0,0,5,"Egresos cama UCI Neo",1,1],
[0,0,5,"Egresos cama UTI Adulto",1,1],
[0,0,5,"Egresos cama UCI Adulto",1,1],
[0,0,5,"Egresos cama media Adulto",1,1],
[0,0,5,"Egresos cama básica Adulto",1,1],
[0,0,5,"Egresos cama Psiquiátrica",1,1],
[0,0,3,"Egresos cama básica pediátrica",1,1],
[0,0,3,"Egresos cama media pediátrica",1,1],
[0,0,3,"Egresos cama UCI pediátrica",1,1],
[0,0,3,"Egresos cama UTI pediátrica",1,1],
[0,0,3,"Egresos cama básica Neo",1,1],
[0,0,3,"Egresos cama UTI Neo",1,1],
[0,0,3,"Egresos cama UCI Neo",1,1],
[0,0,3,"Egresos cama UTI Adulto",1,1],
[0,0,3,"Egresos cama UCI Adulto",1,1],
[0,0,3,"Egresos cama media Adulto",1,1],
[0,0,3,"Egresos cama básica Adulto",1,1],
[0,0,3,"Egresos cama Psiquiátrica",1,1],
[0,0,1,"Egresos cama básica pediátrica",1,1],
[0,0,1,"Egresos cama media pediátrica",1,1],
[0,0,1,"Egresos cama UCI pediátrica",1,1],
[0,0,1,"Egresos cama UTI pediátrica",1,1],
[0,0,1,"Egresos cama básica Neo",1,1],
[0,0,1,"Egresos cama UTI Neo",1,1],
[0,0,1,"Egresos cama UCI Neo",1,1],
[0,0,1,"Egresos cama UTI Adulto",1,1],
[0,0,1,"Egresos cama UCI Adulto",1,1],
[0,0,1,"Egresos cama media Adulto",1,1],
[0,0,1,"Egresos cama básica Adulto",1,1],
[0,0,1,"Egresos cama Psiquiátrica",1,1],
[2,0,6,"Pabellon Cirugía Mayor (segundo o tercer cirujano)",1,1],
[2,0,6,"Pabellon Cirugía Mayor Ambulatoria (segundo o tercer cirujano)",1,1],
[2,0,2,"Pabellon Cirugía Mayor (segundo o tercer cirujano)",1,1],
[2,0,2,"Pabellon Cirugía Mayor Ambulatoria (segundo o tercer cirujano)",1,1],
[2,0,5,"Pabellon Cirugía Mayor (segundo o tercer cirujano)",1,1],
[2,0,5,"Pabellon Cirugía Mayor Ambulatoria (segundo o tercer cirujano)",1,1],
[2,0,3,"Pabellon Cirugía Mayor (segundo o tercer cirujano)",1,1],
[2,0,3,"Pabellon Cirugía Mayor Ambulatoria (segundo o tercer cirujano)",1,1],
[2,0,1,"Pabellon Cirugía Mayor (segundo o tercer cirujano)",1,1],
[2,0,1,"Pabellon Cirugía Mayor Ambulatoria (segundo o tercer cirujano)",1,1],
[2,0,6,"Pabellon Cirugía Obstétrica (segundo o tercer cirujano)",1,0],
[3,0,1,"Pabellon Cirugía Urgencia (segundo o tercer cirujano)",1,0],
[3,0,6,"Pabellon Cirugía Urgencia (segundo o tercer cirujano)",1,0],
[3,0,4,"Pabellon Cirugía Urgencia (segundo o tercer cirujano)",1,0],
[3,0,2,"Pabellon Cirugía Urgencia (segundo o tercer cirujano)",1,0],
[3,0,5,"Pabellon Cirugía Urgencia (segundo o tercer cirujano)",1,0],
[3,0,3,"Pabellon Cirugía Urgencia (segundo o tercer cirujano)",1,0],
[1,0,6,"Atención en sala cama básica pediátrica",1,1],
[1,0,6,"Atención en sala cama media pediátrica",1,1],
[1,0,6,"Atención en sala cama UCI pediátrica",1,1],
[1,0,6,"Atención en sala cama UTI pediátrica",1,1],
[1,0,6,"Atención en sala cama básica Neo",1,1],
[1,0,6,"Atención en sala cama UTI Neo",1,1],
[1,0,6,"Atención en sala cama UCI Neo",1,1],
[1,0,4,"Atención en sala cama básica pediátrica",1,1],
[1,0,4,"Atención en sala cama media pediátrica",1,1],
[1,0,4,"Atención en sala cama UCI pediátrica",1,1],
[1,0,4,"Atención en sala cama UTI pediátrica",1,1],
[1,0,4,"Atención en sala cama básica Neo",1,1],
[1,0,4,"Atención en sala cama UTI Neo",1,1],
[1,0,4,"Atención en sala cama UCI Neo",1,1],
[1,0,2,"Atención en sala cama básica pediátrica",1,1],
[1,0,2,"Atención en sala cama media pediátrica",1,1],
[1,0,2,"Atención en sala cama UCI pediátrica",1,1],
[1,0,2,"Atención en sala cama UTI pediátrica",1,1],
[1,0,2,"Atención en sala cama básica Neo",1,1],
[1,0,2,"Atención en sala cama UTI Neo",1,1],
[1,0,2,"Atención en sala cama UCI Neo",1,1],
[1,0,5,"Atención en sala cama básica pediátrica",1,1],
[1,0,5,"Atención en sala cama media pediátrica",1,1],
[1,0,5,"Atención en sala cama UCI pediátrica",1,1],
[1,0,5,"Atención en sala cama UTI pediátrica",1,1],
[1,0,5,"Atención en sala cama básica Neo",1,1],
[1,0,5,"Atención en sala cama UTI Neo",1,1],
[1,0,5,"Atención en sala cama UCI Neo",1,1],
[1,0,3,"Atención en sala cama básica pediátrica",1,1],
[1,0,3,"Atención en sala cama media pediátrica",1,1],
[1,0,3,"Atención en sala cama UCI pediátrica",1,1],
[1,0,3,"Atención en sala cama UTI pediátrica",1,1],
[1,0,3,"Atención en sala cama básica Neo",1,1],
[1,0,3,"Atención en sala cama UTI Neo",1,1],
[1,0,3,"Atención en sala cama UCI Neo",1,1],
[1,0,1,"Atención en sala cama básica pediátrica",1,1],
[1,0,1,"Atención en sala cama media pediátrica",1,1],
[1,0,1,"Atención en sala cama UCI pediátrica",1,1],
[1,0,1,"Atención en sala cama UTI pediátrica",1,1],
[1,0,1,"Atención en sala cama básica Neo",1,1],
[1,0,1,"Atención en sala cama UTI Neo",1,1],
[1,0,1,"Atención en sala cama UCI Neo",1,1],
[0,0,1,"Visita a sala Hospitalizado cama básica pediátrica",1,1],
[0,0,1,"Visita a sala Hospitalizado cama media pediátrica",1,1],
[0,0,1,"Visita a sala Hospitalizado cama UCI pediátrica",1,1],
[0,0,1,"Visita a sala Hospitalizado cama UTI pediátrica",1,1],
[0,0,1,"Visita a sala Hospitalizado cama básica Neo",1,1],
[0,0,1,"Visita a sala Hospitalizado cama UTI Neo",1,1],
[0,0,1,"Visita a sala Hospitalizado cama UCI Neo",1,1],
[0,0,6,"Visita a sala Hospitalizado cama básica pediátrica",1,1],
[0,0,6,"Visita a sala Hospitalizado cama media pediátrica",1,1],
[0,0,6,"Visita a sala Hospitalizado cama UCI pediátrica",1,1],
[0,0,6,"Visita a sala Hospitalizado cama UTI pediátrica",1,1],
[0,0,6,"Visita a sala Hospitalizado cama básica Neo",1,1],
[0,0,6,"Visita a sala Hospitalizado cama UTI Neo",1,1],
[0,0,6,"Visita a sala Hospitalizado cama UCI Neo",1,1],
[0,0,4,"Visita a sala Hospitalizado cama básica pediátrica",1,1],
[0,0,4,"Visita a sala Hospitalizado cama media pediátrica",1,1],
[0,0,4,"Visita a sala Hospitalizado cama UCI pediátrica",1,1],
[0,0,4,"Visita a sala Hospitalizado cama UTI pediátrica",1,1],
[0,0,4,"Visita a sala Hospitalizado cama básica Neo",1,1],
[0,0,4,"Visita a sala Hospitalizado cama UTI Neo",1,1],
[0,0,4,"Visita a sala Hospitalizado cama UCI Neo",1,1],
[0,0,2,"Visita a sala Hospitalizado cama básica pediátrica",1,1],
[0,0,2,"Visita a sala Hospitalizado cama media pediátrica",1,1],
[0,0,2,"Visita a sala Hospitalizado cama UCI pediátrica",1,1],
[0,0,2,"Visita a sala Hospitalizado cama UTI pediátrica",1,1],
[0,0,2,"Visita a sala Hospitalizado cama básica Neo",1,1],
[0,0,2,"Visita a sala Hospitalizado cama UTI Neo",1,1],
[0,0,2,"Visita a sala Hospitalizado cama UCI Neo",1,1],
[0,0,5,"Visita a sala Hospitalizado cama básica pediátrica",1,1],
[0,0,5,"Visita a sala Hospitalizado cama media pediátrica",1,1],
[0,0,5,"Visita a sala Hospitalizado cama UCI pediátrica",1,1],
[0,0,5,"Visita a sala Hospitalizado cama UTI pediátrica",1,1],
[0,0,5,"Visita a sala Hospitalizado cama básica Neo",1,1],
[0,0,5,"Visita a sala Hospitalizado cama UTI Neo",1,1],
[0,0,5,"Visita a sala Hospitalizado cama UCI Neo",1,1],
[0,0,3,"Visita a sala Hospitalizado cama básica pediátrica",1,1],
[0,0,3,"Visita a sala Hospitalizado cama media pediátrica",1,1],
[0,0,3,"Visita a sala Hospitalizado cama UCI pediátrica",1,1],
[0,0,3,"Visita a sala Hospitalizado cama UTI pediátrica",1,1],
[0,0,3,"Visita a sala Hospitalizado cama básica Neo",1,1],
[0,0,3,"Visita a sala Hospitalizado cama UTI Neo",1,1],
[0,0,3,"Visita a sala Hospitalizado cama UCI Neo",1,1],
[0,0,2,"Visita a sala Hospitalizado cama media Adulto",1,1],
[0,0,1,"Visita a sala Hospitalizado cama media Adulto",1,1],
[0,0,3,"Visita a sala Hospitalizado cama media Adulto",1,1],
[0,0,4,"Visita a sala Hospitalizado cama media Adulto",1,1],
[0,0,5,"Visita a sala Hospitalizado cama básica Adulto",1,1],
[0,0,5,"Visita a sala Hospitalizado cama media Adulto",1,1],
[0,0,3,"Visita a sala Hospitalizado cama básica Adulto",1,1],
[0,0,6,"Visita a sala Hospitalizado cama básica Adulto",1,1],
[0,0,4,"Visita a sala Hospitalizado cama básica Adulto",1,1],
[0,0,1,"Visita a sala Hospitalizado cama básica Adulto",1,1],
[0,0,6,"Visita a sala Hospitalizado cama media Adulto",1,1],
[0,0,2,"Visita a sala Hospitalizado cama básica Adulto",1,1],
[0,0,1,"Visita a sala Hospitalizado cama UTI Adulto",1,1],
[0,0,1,"Visita a sala Hospitalizado cama UCI Adulto",1,1],
[1,0,4,"Atención en sala cama media Adulto",1,1],
[1,0,4,"Atención en sala cama básica Adulto",1,1],
[1,0,6,"Atención en sala cama media Adulto",1,1],
[1,0,3,"Atención en sala cama básica Adulto",1,1],
[1,0,3,"Atención en sala cama media Adulto",1,1],
[1,0,4,"Atención en sala cama UCI Adulto",1,1],
[1,0,1,"Atención en sala cama UCI Adulto",1,1],
[1,0,2,"Atención en sala cama media Adulto",1,1],
[1,0,6,"Atención en sala cama básica Adulto",1,1],
[1,0,1,"Atención en sala cama media Adulto",1,1],
[1,0,4,"Atención en sala cama UTI Adulto",1,1],
[1,0,5,"Atención en sala cama media Adulto",1,1],
[1,0,1,"Atención en sala cama UTI Adulto",1,1],
[1,0,1,"Atención en sala cama básica Adulto",1,1],
[1,0,4,"Atención en sala cama Psiquiátrica",1,1],
[1,0,4,"Egresos cama básica Psiquiátrica",1,1],
[1,0,2,"Atención en sala cama básica Adulto",1,1],
[1,0,5,"Atención en sala cama básica Adulto",1,1],
[0,0,4,"Colonoscopía larga (incluye sigmoidoscopía y ....)",1,1],
[0,0,4,"Ecocardiograma con/sin Doppler",1,1],
[0,0,6,"Ecografía Obstétrica",1,1],
[3,0,1,"Pabellon Cirugía Obstétrica",1,0],
[3,0,6,"Pabellon Cirugía Obstétrica",1,0],
[3,0,4,"Pabellon Cirugía Obstétrica",1,0],
[3,0,2,"Pabellon Cirugía Obstétrica",1,0],
[3,0,5,"Pabellon Cirugía Obstétrica",1,0],
[3,0,3,"Pabellon Cirugía Obstétrica",1,0],
[3,0,1,"Pabellon Cirugía Obstétrica (segundo o tercer cirujano)",1,0],
[3,0,6,"Pabellon Cirugía Obstétrica (segundo o tercer cirujano)",1,0],
[3,0,4,"Pabellon Cirugía Obstétrica (segundo o tercer cirujano)",1,0],
[3,0,2,"Pabellon Cirugía Obstétrica (segundo o tercer cirujano)",1,0],
[3,0,5,"Pabellon Cirugía Obstétrica (segundo o tercer cirujano)",1,0],
[3,0,3,"Pabellon Cirugía Obstétrica (segundo o tercer cirujano)",1,0],
[3,0,6,"Atención de Servicio de Urgencia C1 (Obs)",1,1],
[3,0,6,"Atención de Servicio de Urgencia C2 (Obs)",1,1],
[3,0,6,"Atención de Servicio de Urgencia C3 (Obs)",1,1],
[3,0,6,"Atención de Servicio de Urgencia C4 (Obs)",1,1],
[3,0,6,"Atención de Servicio de Urgencia C5 (Obs)",1,1],
[0,0,1,"Consulta nueva presencial (Acto Único)",1,1],
[0,0,6,"Consulta nueva presencial (Acto Único)",1,1],
[0,0,4,"Consulta nueva presencial (Acto Único)",1,1],
[0,0,2,"Consulta nueva presencial (Acto Único)",1,1],
[0,0,5,"Consulta nueva presencial (Acto Único)",1,1],
[0,0,3,"Consulta nueva presencial (Acto Único)",1,1],
[0,0,1,"Atención domiciliaria",1,1],
[0,0,6,"Atención domiciliaria",1,1],
[0,0,4,"Atención domiciliaria",1,1],
[0,0,2,"Atención domiciliaria",1,1],
[0,0,5,"Atención domiciliaria",1,1],
[0,0,3,"Atención domiciliaria",1,1],
[3,0,6,"Atención de Servicio de Urgencia C3",1,1],
[3,0,6,"Atención de Servicio de Urgencia C1-C2",1,1],
[3,0,6,"Atención de Servicio de Urgencia C4-C5",1,1],
[3,0,3,"Visita a sala Hospitalizado cama media Adulto",1,1],
[0,0,1,"Capacitación avance tecnológico",1,1],
[0,0,6,"Capacitación avance tecnológico",1,1],
[0,0,4,"Capacitación avance tecnológico",1,1],
[0,0,2,"Capacitación avance tecnológico",1,1],
[0,0,5,"Capacitación avance tecnológico",1,1],
[0,0,3,"Capacitación avance tecnológico",1,1],
[1,0,6,"Capacitación avance tecnológico",1,1],
[1,0,4,"Capacitación avance tecnológico",1,1],
[1,0,2,"Capacitación avance tecnológico",1,1],
[1,0,5,"Capacitación avance tecnológico",1,1],
[1,0,3,"Capacitación avance tecnológico",1,1],
[2,0,6,"Capacitación avance tecnológico",1,1],
[2,0,2,"Capacitación avance tecnológico",1,1],
[2,0,5,"Capacitación avance tecnológico",1,1],
[2,0,3,"Capacitación avance tecnológico",1,1],
[3,0,1,"Capacitación avance tecnológico",1,1],
[3,0,6,"Capacitación avance tecnológico",1,1],
[3,0,4,"Capacitación avance tecnológico",1,1],
[3,0,2,"Capacitación avance tecnológico",1,1],
[3,0,5,"Capacitación avance tecnológico",1,1],
[3,0,3,"Capacitación avance tecnológico",1,1],
[1,0,1,"Capacitación avance tecnológico",1,1],
[2,0,1,"Capacitación avance tecnológico",1,1],
[0,1,0,"Actividad Comunitaria (SM)",0,0],
[0,1,0,"Actividades con organizaciones de usuarios y familiares (SM)",0,0],
[0,1,0,"Actividades de cuidado del equipo",0,1],
[0,1,0,"Administración de medicamentos",1,1],
[0,1,0,"Atención de Enlace o Interconsulta a sala",1,1],
[0,1,0,"Colaboración y formación con grupos de autoayuda (SM)",0,0],
[0,1,0,"Comité Articulador de Continuidad de Cuidados (SM)",1,0],
[0,1,0,"Comité clínico",1,0],
[0,1,0,"Comité de ingreso a atención cerrada (SM)",1,0],
[0,1,0,"Comité Oncológico",1,0],
[0,1,0,"Consejo Técnico de Salud Mental en el Servicio de Salud (SM)",0,0],
[0,1,0,"Consejeria en salud",1,0],
[0,1,0,"Consulta Abreviada no Médica",1,1],
[0,1,0,"Consulta Control Presencial (ESPECIALIDADES)",1,1],
[0,1,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,1],
[0,1,0,"Consulta Control Salud Mental",1,1],
[0,1,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,1],
[0,1,0,"Consulta Nueva Presencial (ESPECIALIDADES)",1,1],
[0,1,0,"Consulta Nueva Presencial (SM)",1,1],
[0,1,0,"Consultoría en salud",1,1],
[0,1,0,"Contacto telefónico: Consulta Abreviada",1,1],
[0,1,0,"Contacto telefónico: Consulta Control",1,1],
[0,1,0,"Contacto telefónico: Consultoría",1,1],
[0,1,0,"Contrareferencia",1,1],
[0,1,0,"Coordinación con Equipos de la red de salud (PCI/ SM)",0,0],
[0,1,0,"Coordinación pacientes GES/LRS",1,1],
[0,1,0,"Curaciones control",1,1],
[0,1,0,"Curaciones ingreso",1,1],
[0,1,0,"Derivación Asistida SM",1,0],
[0,1,0,"Docencia e Investigación",1,0],
[0,1,0,"Educación Grupal",1,0],
[0,1,0,"Educación Individual",1,1],
[0,1,0,"Educación remota a usuario y/o cuidador",1,1],
[0,1,0,"Gestión de Casos",1,1],
[0,1,0,"Gestión de Casos SM",1,0],
[0,1,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,1,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[0,1,0,"Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)",1,0],
[0,1,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[0,1,0,"OANC Registros clínicos",0,0],
[0,1,0,"OANC Actividades administrativas",0,0],
[0,1,0,"OANC Administración de personal",0,0],
[0,1,0,"OANC Comité de apoyo a la gestión",0,0],
[0,1,0,"Otras Actividades Clínicas",1,0],
[0,1,0,"Otras Actividades No Clínicas",0,0],
[0,1,0,"Pertinencia (IC)",1,1],
[0,1,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[0,1,0,"Procedimientos Invasivos (Propios)",1,0],
[0,1,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[0,1,0,"Procedimientos No Invasivos (Propios)",1,0],
[0,1,0,"Rescate en Domicilio (SM)",1,0],
[0,1,0,"Rescate no presencial (SM)",1,1],
[0,1,0,"Reunión Clínica",1,0],
[0,1,0,"Reunión Técnica Administrativa",0,0],
[0,1,0,"Taller Grupal",1,0],
[0,1,0,"Teleconsulta abreviada (Videollamada)",1,1],
[0,1,0,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,1,0,"Trabajo intersectorial (SM)",0,0],
[0,1,0,"Trabajo sectorial (SM)",0,0],
[0,1,0,"Visita Domiciliaria",1,1],
[0,1,0,"Visita Integral de Salud Mental (SM)",1,0],
[0,1,0,"Visita Integral de Salud Mental Hospital de Día y UHCIP (SM)",1,0],
[0,4,0,"Actividad Comunitaria (SM)",0,0],
[0,4,0,"Actividades con organizaciones de usuarios y familiares (SM)",0,0],
[0,4,0,"Actividades de cuidado del equipo",0,1],
[0,4,0,"Atención de Enlace o Interconsulta a sala",1,1],
[0,4,0,"Colaboración y formación con grupos de autoayuda (SM)",0,0],
[0,4,0,"Comité Articulador de Continuidad de Cuidados (SM)",1,0],
[0,4,0,"Comité clínico",1,0],
[0,4,0,"Comité de ingreso a atención cerrada (SM)",1,0],
[0,4,0,"Comité Oncológico",1,0],
[0,4,0,"Consejo Técnico de Salud Mental en el Servicio de Salud (SM)",0,0],
[0,4,0,"Consejeria en salud",1,0],
[0,4,0,"Consulta Abreviada no Médica",1,1],
[0,4,0,"Consulta Control Presencial (ESPECIALIDADES)",1,1],
[0,4,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,1],
[0,4,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,1],
[0,4,0,"Consulta Nueva Presencial (ESPECIALIDADES)",1,1],
[0,4,0,"Consultoría en salud",1,1],
[0,4,0,"Contacto telefónico: Consulta Abreviada",1,1],
[0,4,0,"Contacto telefónico: Consulta Control",1,1],
[0,4,0,"Contrareferencia",1,1],
[0,4,0,"Coordinación con Equipos de la red de salud (PCI/ SM)",0,0],
[0,4,0,"Derivación Asistida SM",1,0],
[0,4,0,"Docencia e Investigación",1,0],
[0,4,0,"Educación Individual",1,1],
[0,4,0,"Educación remota a usuario y/o cuidador",1,1],
[0,4,0,"Evaluación inicial PRESENCIAL",1,1],
[0,4,0,"Evaluación intermedia PRESENCIAL",1,1],
[0,4,0,"Evaluación Intermedia remota",1,1],
[0,4,0,"Gestión de Casos",1,1],
[0,4,0,"Gestión de Casos SM",1,0],
[0,4,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,4,0,"Hospitalización Domiciliaria",1,0],
[0,4,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[0,4,0,"Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)",1,0],
[0,4,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[0,4,0,"Otras Actividades Clínicas",1,0],
[0,4,0,"Otras Actividades No Clínicas",0,0],
[0,4,0,"Pertinencia (IC)",1,1],
[0,4,0,"Procedimientos No Invasivos (Propios)",1,0],
[0,4,0,"Rescate en Domicilio (SM)",1,0],
[0,4,0,"Rescate no presencial (SM)",1,1],
[0,4,0,"Reunión Clínica",1,0],
[0,4,0,"Reunión Técnica Administrativa",0,0],
[0,4,0,"Ronda otro establecimiento",1,0],
[0,4,0,"Sesión de rehabilitación vía remota (Telerehabilitación)",1,1],
[0,4,0,"Sesiones de Rehabilitación PRESENCIAL",1,1],
[0,4,0,"Taller Grupal",1,0],
[0,4,0,"Teleconsultoria Salud Mental",1,1],
[0,4,0,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,4,0,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,4,0,"Telemedicina: Teleconsulta Control",1,1],
[0,4,0,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,4,0,"Telemedicina: Teleconsulta Nueva",1,1],
[0,4,0,"Trabajo intersectorial (SM)",0,0],
[0,4,0,"Trabajo sectorial (SM)",0,0],
[0,4,0,"Visita Domiciliaria",1,1],
[0,4,0,"Visita Integral de Salud Mental (SM)",1,0],
[0,4,0,"Visita Integral de Salud Mental Hospital de Día y UHCIP (SM)",1,0],
[0,3,0,"Actividad Comunitaria (SM)",0,0],
[0,3,0,"Actividades con organizaciones de usuarios y familiares (SM)",0,0],
[0,3,0,"Actividades de cuidado del equipo",0,1],
[0,3,0,"Atención de Enlace o Interconsulta a sala",1,1],
[0,3,0,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,3,0,"Colaboración y formación con grupos de autoayuda (SM)",0,0],
[0,3,0,"Comité Articulador de Continuidad de Cuidados (SM)",1,0],
[0,3,0,"Comité clínico",1,0],
[0,3,0,"Comité de ingreso a atención cerrada (SM)",1,0],
[0,3,0,"Comité Oncológico",1,0],
[0,3,0,"Consejo Técnico de Salud Mental en el Servicio de Salud (SM)",0,0],
[0,3,0,"Consulta Abreviada no Médica",1,1],
[0,3,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,1],
[0,3,0,"Consulta de ingreso a equipo PRAIS",1,1],
[0,3,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,1],
[0,3,0,"Consultoría en salud",1,1],
[0,3,0,"Contacto telefónico: Consulta Abreviada",1,1],
[0,3,0,"Contacto telefónico: Consulta Control",1,1],
[0,3,0,"Contacto telefónico: Consultoría",1,1],
[0,3,0,"Contrareferencia",1,1],
[0,3,0,"Coordinación con Equipos de la red de salud (PCI/ SM)",0,0],
[0,3,0,"Derivación Asistida SM",1,0],
[0,3,0,"Docencia e Investigación",1,0],
[0,3,0,"Educación Individual",1,1],
[0,3,0,"Educación remota a usuario y/o cuidador",1,1],
[0,3,0,"Evaluación inicial PRESENCIAL",1,1],
[0,3,0,"Evaluación integral de daño",1,1],
[0,3,0,"Evaluación intermedia PRESENCIAL",1,1],
[0,3,0,"Evaluación Intermedia remota",1,1],
[0,3,0,"Gestión de Casos",1,1],
[0,3,0,"Gestión de Casos SM",1,0],
[0,3,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,3,0,"Hospitalización Domiciliaria",1,0],
[0,3,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[0,3,0,"Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)",1,0],
[0,3,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[0,3,0,"OANC Registros clínicos",0,0],
[0,3,0,"OANC Actividades administrativas",0,0],
[0,3,0,"OANC Administración de personal",0,0],
[0,3,0,"OANC Comité de apoyo a la gestión",0,0],
[0,3,0,"OANC Comité de programación",0,0],
[0,3,0,"OANC Comité paritario",0,0],
[0,3,0,"Otras Actividades Clínicas",1,0],
[0,3,0,"Otras Actividades No Clínicas",0,0],
[0,3,0,"Pertinencia (IC)",1,1],
[0,3,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[0,3,0,"Procedimientos Invasivos (Propios)",1,0],
[0,3,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[0,3,0,"Procedimientos No Invasivos (Propios)",1,0],
[0,3,0,"Rescate en Domicilio (SM)",1,0],
[0,3,0,"Rescate no presencial (SM)",1,1],
[0,3,0,"Reunión Clínica",1,0],
[0,3,0,"Reunión Técnica Administrativa",0,0],
[0,3,0,"Ronda otro establecimiento",1,0],
[0,3,0,"Sesión de rehabilitación vía remota (Telerehabilitación)",1,1],
[0,3,0,"Sesiones de Rehabilitación a distancia",1,1],
[0,3,0,"Sesiones de Rehabilitación PRESENCIAL",1,1],
[0,3,0,"Taller Grupal",1,0],
[0,3,0,"Taller Grupal a Distancia",1,0],
[0,3,0,"Teleconsultoria Salud Mental",1,1],
[0,3,0,"Telemedicina: Teleconsulta Control",1,1],
[0,3,0,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,3,0,"Telemedicina: Teleconsulta Nueva",1,1],
[0,3,0,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,3,0,"Trabajo intersectorial (SM)",0,0],
[0,3,0,"Trabajo sectorial (SM)",0,0],
[0,3,0,"Trabajo sectorial de información y sensibilización",0,1],
[0,3,0,"Visita Integral de Salud Mental (SM)",1,0],
[0,3,0,"Visita Integral de Salud Mental Hospital de Día y UHCIP (SM)",1,0],
[0,2,0,"Actividades de cuidado del equipo",0,1],
[0,2,0,"Atención de Enlace o Interconsulta a sala",1,1],
[0,2,0,"Comité clínico",1,0],
[0,2,0,"Comité Oncológico",1,0],
[0,2,0,"Consejeria en salud",1,0],
[0,2,0,"Consulta Abreviada no Médica",1,1],
[0,2,0,"Consulta Matrona ARO",1,1],
[0,2,0,"Consulta Matrona ARO POR LEY IVE",1,1],
[0,2,0,"Consulta matrona ginecología y otros",1,1],
[0,2,0,"Consulta matrona infertilidad",1,1],
[0,2,0,"Consultoría en salud",1,1],
[0,2,0,"Contacto telefónico: Consulta Abreviada",1,1],
[0,2,0,"Contacto telefónico: Consulta Control",1,1],
[0,2,0,"Contacto telefónico: Consultoría",1,1],
[0,2,0,"Contrareferencia",1,1],
[0,2,0,"Docencia e Investigación",1,0],
[0,2,0,"Educación Grupal",1,0],
[0,2,0,"Educación Individual",1,1],
[0,2,0,"Educación remota a usuario y/o cuidador",1,1],
[0,2,0,"Gestión de camas",1,1],
[0,2,0,"Gestión de Casos",1,1],
[0,2,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,2,0,"OANC Registros clínicos",0,0],
[0,2,0,"OANC Actividades administrativas",0,0],
[0,2,0,"OANC Administración de personal",0,0],
[0,2,0,"OANC Comité de apoyo a la gestión",0,0],
[0,2,0,"OANC Comité de programación",0,0],
[0,2,0,"OANC Comité paritario",0,0],
[0,2,0,"Otras Actividades Clínicas",1,0],
[0,2,0,"Otras Actividades No Clínicas",0,0],
[0,2,0,"Pertinencia (IC)",1,1],
[0,2,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[0,2,0,"Procedimientos Invasivos (Propios)",1,0],
[0,2,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[0,2,0,"Procedimientos No Invasivos (Propios)",1,0],
[0,2,0,"Reunión Clínica",1,0],
[0,2,0,"Reunión Técnica Administrativa",0,0],
[0,2,0,"Taller Grupal",1,0],
[0,2,0,"Telecomité",1,1],
[0,2,0,"Teleconsulta abreviada (Videollamada)",1,1],
[0,2,0,"Telemedicina control (Teleinterconsulta asincrónica)",1,1],
[0,2,0,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,2,0,"Telemedicina Nueva (Teleinterconsulta asincrónica)",1,1],
[0,2,0,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,2,0,"Telemedicina: Teleconsulta Control",1,1],
[0,2,0,"Telemedicina: Teleconsulta Nueva",1,1],
[0,2,0,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[0,2,0,"Trabajo sectorial de información y sensibilización",0,1],
[0,2,0,"Visita Domiciliaria",1,1],
[0,5,0,"Actividades de cuidado del equipo",0,1],
[0,5,0,"Atención de Enlace o Interconsulta a sala",1,1],
[0,5,0,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[0,5,0,"Atención Nutricional en Sala",1,1],
[0,5,0,"Atención Nutricional Intensiva (ANI)",1,1],
[0,5,0,"Comité clínico",1,0],
[0,5,0,"Comité Oncológico",1,0],
[0,5,0,"Consejeria en salud",1,0],
[0,5,0,"Consulta Abreviada no Médica",1,1],
[0,5,0,"Consulta Control Presencial (ESPECIALIDADES)",1,1],
[0,5,0,"Consulta Nueva Presencial (ESPECIALIDADES)",1,1],
[0,5,0,"Consultoría en salud",1,1],
[0,5,0,"Contacto telefónico: Consulta Abreviada",1,1],
[0,5,0,"Contacto telefónico: Consulta Control",1,1],
[0,5,0,"Docencia e Investigación",1,0],
[0,5,0,"Educación Individual",1,1],
[0,5,0,"Educación nutricional establecimiento o/y espacios públicos.",1,1],
[0,5,0,"Educación remota a usuario y/o cuidador",1,1],
[0,5,0,"Gestión de Casos",1,1],
[0,5,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,5,0,"Hospitalización Domiciliaria",1,0],
[0,5,0,"OANC Registros clínicos",0,0],
[0,5,0,"OANC Actividades administrativas",0,0],
[0,5,0,"OANC Administración de personal",0,0],
[0,5,0,"OANC Comité de apoyo a la gestión",0,0],
[0,5,0,"Otras Actividades Clínicas",1,0],
[0,5,0,"Otras Actividades No Clínicas",0,0],
[0,5,0,"Pertinencia (IC)",1,1],
[0,5,0,"Procedimientos No Invasivos (Propios)",1,0],
[0,5,0,"Reunión Clínica",1,0],
[0,5,0,"Reunión Técnica Administrativa",0,0],
[0,5,0,"Ronda otro establecimiento",1,0],
[0,5,0,"Sesiones de Rehabilitación PRESENCIAL",1,1],
[0,5,0,"Taller Grupal",1,0],
[0,5,0,"Telecomité",1,1],
[0,5,0,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,5,0,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,5,0,"Telemedicina: Teleconsulta Control",1,1],
[0,5,0,"Telemedicina: Teleconsulta Control Salud Mental",1,1],
[0,5,0,"Telemedicina: Teleconsulta Nueva",1,1],
[0,5,0,"Visita Domiciliaria",1,1],
[0,6,0,"Actividad Comunitaria (SM)",0,0],
[0,6,0,"Actividades con organizaciones de usuarios y familiares (SM)",0,0],
[0,6,0,"Actividades de cuidado del equipo",0,1],
[0,6,0,"Atención de Enlace o Interconsulta a sala",1,1],
[0,6,0,"Colaboración y formación con grupos de autoayuda (SM)",0,0],
[0,6,0,"Comité Articulador de Continuidad de Cuidados (SM)",1,0],
[0,6,0,"Comité clínico",1,0],
[0,6,0,"Comité de ingreso a atención cerrada (SM)",1,0],
[0,6,0,"Consejo Técnico de Salud Mental en el Servicio de Salud (SM)",0,0],
[0,6,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,1],
[0,6,0,"Consulta Control Salud Mental",1,1],
[0,6,0,"Consulta e Interconsulta en Unidades de Emergencia Hospitalaria (UEH) (Equipo de enlace)",1,1],
[0,6,0,"Consulta Ingreso Equipo de Salud Mental",1,1],
[0,6,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,1],
[0,6,0,"Consulta Nueva Presencial (SM)",1,1],
[0,6,0,"Consultoría en Salud Mental (Presencial)",1,0],
[0,6,0,"Coordinación con Equipos de la red de salud (PCI/ SM)",0,0],
[0,6,0,"Derivación Asistida SM",1,0],
[0,6,0,"Docencia e Investigación",1,0],
[0,6,0,"Evaluación inicial PRESENCIAL",1,1],
[0,6,0,"Evaluación intermedia PRESENCIAL",1,1],
[0,6,0,"Gestión de Casos SM",1,0],
[0,6,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,6,0,"Gestion Terapeutica",1,1],
[0,6,0,"Intervención en Crisis",1,0],
[0,6,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[0,6,0,"Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)",1,0],
[0,6,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[0,6,0,"OANC Actividades administrativas",0,0],
[0,6,0,"Otras Actividades Clínicas",1,0],
[0,6,0,"Otras Actividades No Clínicas",0,0],
[0,6,0,"Pertinencia (IC)",1,1],
[0,6,0,"Psicodiagnóstico",1,1],
[0,6,0,"Psicoterapia Familiar (SM) (incluye presencial y remoto)",1,1],
[0,6,0,"Psicoterapia Grupal (SM) (incluye presencial y remoto)",1,1],
[0,6,0,"Psicoterapia Individual (SM) (incluye presencial y remoto)",1,1],
[0,6,0,"Rescate en Domicilio (SM)",1,0],
[0,6,0,"Rescate no presencial (SM)",1,1],
[0,6,0,"Reunión Técnica Administrativa",0,0],
[0,6,0,"Sesiones de Rehabilitación PRESENCIAL",1,1],
[0,6,0,"Teleconsulta Control Salud Mental",1,1],
[0,6,0,"Teleconsultoria Salud Mental",1,1],
[0,6,0,"Trabajo intersectorial (SM)",0,0],
[0,6,0,"Trabajo sectorial (SM)",0,0],
[0,6,0,"Visita Domiciliaria",1,1],
[0,6,0,"Visita Integral de Salud Mental (SM)",1,0],
[0,6,0,"Visita Integral de Salud Mental Hospital de Día y UHCIP (SM)",1,0],
[0,7,0,"Actividad Comunitaria (SM)",0,0],
[0,7,0,"Actividades con organizaciones de usuarios y familiares (SM)",0,0],
[0,7,0,"Actividades de cuidado del equipo",0,1],
[0,7,0,"Colaboración y formación con grupos de autoayuda (SM)",0,0],
[0,7,0,"Comité Articulador de Continuidad de Cuidados (SM)",1,0],
[0,7,0,"Comité clínico",1,0],
[0,7,0,"Comité de ingreso a atención cerrada (SM)",1,0],
[0,7,0,"Consejo Técnico de Salud Mental en el Servicio de Salud (SM)",0,0],
[0,7,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,1],
[0,7,0,"Consulta Control Salud Mental",1,1],
[0,7,0,"Consulta Ingreso Equipo de Salud Mental",1,1],
[0,7,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,1],
[0,7,0,"Consultoría en Salud Mental (Presencial)",1,0],
[0,7,0,"Coordinación con Equipos de la red de salud (PCI/ SM)",0,0],
[0,7,0,"Derivación Asistida SM",1,0],
[0,7,0,"Docencia e Investigación",1,0],
[0,7,0,"Evaluación Diagnóstica de Otros Profesionales",1,1],
[0,7,0,"Gestión de Casos SM",1,0],
[0,7,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,7,0,"Intervención en Crisis",1,0],
[0,7,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[0,7,0,"Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)",1,0],
[0,7,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[0,7,0,"OANC Registros clínicos",0,0],
[0,7,0,"OANC Actividades administrativas",0,0],
[0,7,0,"OANC Administración de personal",0,0],
[0,7,0,"OANC Comité de apoyo a la gestión",0,0],
[0,7,0,"Otras Actividades Clínicas",1,0],
[0,7,0,"Otras Actividades No Clínicas",0,0],
[0,7,0,"Rescate en Domicilio (SM)",1,0],
[0,7,0,"Rescate no presencial (SM)",1,1],
[0,7,0,"Reunión Técnica Administrativa",0,0],
[0,7,0,"Teleconsulta Control Salud Mental",1,1],
[0,7,0,"Teleconsultoria Salud Mental",1,1],
[0,7,0,"Trabajo intersectorial (SM)",0,0],
[0,7,0,"Trabajo sectorial (SM)",0,0],
[0,7,0,"Visita Integral de Salud Mental (SM)",1,0],
[0,7,0,"Visita Integral de Salud Mental Hospital de Día y UHCIP (SM)",1,0],
[0,8,0,"Actividad Comunitaria (SM)",0,0],
[0,8,0,"Actividades con organizaciones de usuarios y familiares (SM)",0,0],
[0,8,0,"Actividades de cuidado del equipo",0,1],
[0,8,0,"Atención de Enlace o Interconsulta a sala",1,1],
[0,8,0,"Colaboración y formación con grupos de autoayuda (SM)",0,0],
[0,8,0,"Comité Articulador de Continuidad de Cuidados (SM)",1,0],
[0,8,0,"Comité clínico",1,0],
[0,8,0,"Comité de ingreso a atención cerrada (SM)",1,0],
[0,8,0,"Consejo Técnico de Salud Mental en el Servicio de Salud (SM)",0,0],
[0,8,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,1],
[0,8,0,"Consulta Control Salud Mental",1,1],
[0,8,0,"Consulta e Interconsulta en Unidades de Emergencia Hospitalaria (UEH) (Equipo de enlace)",1,1],
[0,8,0,"Consulta Ingreso Equipo de Salud Mental",1,1],
[0,8,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,1],
[0,8,0,"Consulta Nueva Presencial (SM)",1,1],
[0,8,0,"Consultoría en Salud Mental (Presencial)",1,0],
[0,8,0,"Coordinación con Equipos de la red de salud (PCI/ SM)",0,0],
[0,8,0,"Derivación Asistida SM",1,0],
[0,8,0,"Docencia e Investigación",1,0],
[0,8,0,"Evaluación Diagnóstica de Otros Profesionales",1,1],
[0,8,0,"Gestión de Casos SM",1,0],
[0,8,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[0,8,0,"Gestion Terapeutica",1,1],
[0,8,0,"Intervención en Crisis",1,0],
[0,8,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[0,8,0,"Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)",1,0],
[0,8,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[0,8,0,"OANC Registros clínicos",0,0],
[0,8,0,"OANC Actividades administrativas",0,0],
[0,8,0,"OANC Administración de personal",0,0],
[0,8,0,"OANC Comité de apoyo a la gestión",0,0],
[0,8,0,"Otras Actividades Clínicas",1,0],
[0,8,0,"Otras Actividades No Clínicas",0,0],
[0,8,0,"Rescate en Domicilio (SM)",1,0],
[0,8,0,"Rescate no presencial (SM)",1,1],
[0,8,0,"Reunión Técnica Administrativa",0,0],
[0,8,0,"Teleconsulta Control Salud Mental",1,1],
[0,8,0,"Teleconsultoria Salud Mental",1,1],
[0,8,0,"Trabajo intersectorial (SM)",0,0],
[0,8,0,"Trabajo sectorial (SM)",0,0],
[0,8,0,"Visita Integral de Salud Mental (SM)",1,0],
[0,8,0,"Visita Integral de Salud Mental Hospital de Día y UHCIP (SM)",1,0],
[1,1,0,"Comité clínico",1,0],
[1,1,0,"Comité Oncológico",1,0],
[1,1,0,"Contrareferencia",1,0],
[1,1,0,"Docencia e Investigación",1,0],
[1,1,0,"Educación Grupal",1,0],
[1,1,0,"Educación Individual",1,0],
[1,1,0,"Educación remota a usuario y/o cuidador",1,1],
[1,1,0,"Gestión de camas",1,0],
[1,1,0,"Gestión de Casos",1,0],
[1,1,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,1,0,"Hospitalización Domiciliaria",1,0],
[1,1,0,"OANC Registros clínicos",0,0],
[1,1,0,"OANC Actividades administrativas",0,0],
[1,1,0,"OANC Administración de personal",0,0],
[1,1,0,"OANC Comité de apoyo a la gestión",0,0],
[1,1,0,"Otras Actividades Clínicas",1,0],
[1,1,0,"Otras Actividades No Clínicas",0,0],
[1,1,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[1,1,0,"Procedimientos Invasivos (Propios)",1,0],
[1,1,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[1,1,0,"Procedimientos No Invasivos (Propios)",1,0],
[1,1,0,"Reunión Clínica",1,0],
[1,1,0,"Taller Grupal",1,0],
[1,1,0,"Telecomité",0,1],
[1,1,0,"Teleconsulta abreviada (Videollamada)",1,1],
[1,1,0,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[1,1,0,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[1,3,0,"Docencia e Investigación",1,0],
[1,3,0,"Gestión de Casos",1,0],
[1,3,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,3,0,"OANC Registros clínicos",0,0],
[1,3,0,"OANC Actividades administrativas",0,0],
[1,3,0,"OANC Administración de personal",0,0],
[1,3,0,"OANC Comité de apoyo a la gestión",0,0],
[1,3,0,"Otras Actividades Clínicas",1,0],
[1,3,0,"Otras Actividades No Clínicas",0,0],
[1,3,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[1,3,0,"Procedimientos Invasivos (Propios)",1,0],
[1,3,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[1,3,0,"Procedimientos No Invasivos (Propios)",1,0],
[1,3,0,"Reunión Clínica",1,0],
[1,2,0,"Actividades de cuidado del equipo",0,0],
[1,2,0,"Atención de Enlace o Interconsulta a sala",1,0],
[1,2,0,"Comité clínico",1,0],
[1,2,0,"Comité Oncológico",1,0],
[1,2,0,"Consejeria en salud",1,0],
[1,2,0,"Docencia e Investigación",1,0],
[1,2,0,"Educación Grupal",1,0],
[1,2,0,"Educación Individual",1,0],
[1,2,0,"Educación remota a usuario y/o cuidador",1,1],
[1,2,0,"Gestión de camas",1,0],
[1,2,0,"Gestión de Casos",1,0],
[1,2,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,2,0,"OANC Registros clínicos",0,0],
[1,2,0,"OANC Actividades administrativas",0,0],
[1,2,0,"OANC Administración de personal",0,0],
[1,2,0,"OANC Comité de apoyo a la gestión",0,0],
[1,2,0,"OANC Comité de programación",0,0],
[1,2,0,"OANC Comité paritario",0,0],
[1,2,0,"Otras Actividades Clínicas",1,0],
[1,2,0,"Otras Actividades No Clínicas",0,0],
[1,2,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[1,2,0,"Procedimientos Invasivos (Propios)",1,0],
[1,2,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[1,2,0,"Procedimientos No Invasivos (Propios)",1,0],
[1,2,0,"Reunión Clínica",1,0],
[1,2,0,"Reunión Técnica Administrativa",0,0],
[1,2,0,"Taller Grupal",1,0],
[1,2,0,"Telecomité",0,1],
[1,2,0,"Teleconsulta abreviada (Videollamada)",1,1],
[1,2,0,"Telemedicina hospitalizado (Teleinterconsulta Asincrónica hospitalizado)",1,1],
[1,2,0,"Telemedicina hospitalizado (Teleinterconsulta Sincrónica hospitalizado)",1,1],
[1,2,0,"Trabajo con agrupaciones de usuarios, comunidad y DDHH",0,1],
[1,2,0,"Trabajo sectorial de información y sensibilización",0,1],
[2,1,0,"Docencia e Investigación",1,0],
[2,1,0,"Gestión de Casos",1,0],
[2,1,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[2,1,0,"OANC Registros clínicos",0,0],
[2,1,0,"OANC Actividades administrativas",0,0],
[2,1,0,"OANC Administración de personal",0,0],
[2,1,0,"OANC Comité de apoyo a la gestión",0,0],
[2,1,0,"Otras Actividades Clínicas",1,0],
[2,1,0,"Otras Actividades No Clínicas",0,0],
[2,1,0,"Pabellon Cirugía Mayor",1,0],
[2,1,0,"Pabellon Cirugía Mayor Ambulatoria",1,0],
[2,1,0,"Pabellon Cirugía Menor",1,0],
[2,1,0,"Pabellon Cirugía Obstetrica",1,0],
[2,1,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[2,1,0,"Procedimientos Invasivos (Propios)",1,0],
[2,1,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[2,1,0,"Procedimientos No Invasivos (Propios)",1,0],
[2,1,0,"Reunión Clínica",1,0],
[2,2,0,"Actividades de cuidado del equipo",0,0],
[2,2,0,"Atención de Enlace o Interconsulta a sala",1,0],
[2,2,0,"Comité clínico",1,0],
[2,2,0,"Comité Oncológico",1,0],
[2,2,0,"Docencia e Investigación",1,0],
[2,2,0,"Educación Individual",1,0],
[2,2,0,"Gestión de Casos",1,0],
[2,2,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[2,2,0,"OANC Registros clínicos",0,0],
[2,2,0,"OANC Actividades administrativas",0,0],
[2,2,0,"OANC Administración de personal",0,0],
[2,2,0,"OANC Comité de apoyo a la gestión",0,0],
[2,2,0,"OANC Comité de programación",0,0],
[2,2,0,"OANC Comité paritario",0,0],
[2,2,0,"Otras Actividades Clínicas",1,0],
[2,2,0,"Otras Actividades No Clínicas",0,0],
[2,2,0,"Pabellon Cirugía Mayor",1,0],
[2,2,0,"Pabellon Cirugía Mayor Ambulatoria",1,0],
[2,2,0,"Pabellon Cirugía Menor",1,0],
[2,2,0,"Pabellon Cirugía Obstetrica",1,0],
[2,2,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[2,2,0,"Procedimientos Invasivos (Propios)",1,0],
[2,2,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[2,2,0,"Procedimientos No Invasivos (Propios)",1,0],
[2,2,0,"Reunión Clínica",1,0],
[2,2,0,"Reunión Técnica Administrativa",0,0],
[3,1,0,"Docencia e Investigación",1,0],
[3,1,0,"Gestión de Casos",1,0],
[3,1,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,1,0,"OANC Registros clínicos",0,0],
[3,1,0,"OANC Actividades administrativas",0,0],
[3,1,0,"OANC Administración de personal",0,0],
[3,1,0,"OANC Comité de apoyo a la gestión",0,0],
[3,1,0,"Otras Actividades Clínicas",1,0],
[3,1,0,"Otras Actividades No Clínicas",0,0],
[3,1,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[3,1,0,"Procedimientos Invasivos (Propios)",1,0],
[3,1,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[3,1,0,"Procedimientos No Invasivos (Propios)",1,0],
[3,1,0,"Reunión Clínica",1,0],
[3,1,0,"Triage",1,1],
[3,3,0,"Docencia e Investigación",1,0],
[3,3,0,"Gestión de Casos",1,0],
[3,3,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,3,0,"OANC Registros clínicos",0,0],
[3,3,0,"OANC Actividades administrativas",0,0],
[3,3,0,"OANC Administración de personal",0,0],
[3,3,0,"OANC Comité de apoyo a la gestión",0,0],
[3,3,0,"Otras Actividades Clínicas",1,0],
[3,3,0,"Otras Actividades No Clínicas",0,0],
[3,3,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[3,3,0,"Procedimientos Invasivos (Propios)",1,0],
[3,3,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[3,3,0,"Procedimientos No Invasivos (Propios)",1,0],
[3,3,0,"Reunión Clínica",1,0],
[3,2,0,"Actividades de cuidado del equipo",0,0],
[3,2,0,"Atención de Enlace o Interconsulta a sala",1,0],
[3,2,0,"Atención de Servicio de Urgencia (Desde Atención Ambulatoria).",1,0],
[3,2,0,"Consejeria en salud",1,0],
[3,2,0,"Consulta Abreviada no Médica",1,0],
[3,2,0,"Consulta Matrona ARO",1,0],
[3,2,0,"Consulta Matrona ARO POR LEY IVE",1,0],
[3,2,0,"Consulta matrona ginecología y otros",1,0],
[3,2,0,"Consultoría en salud",1,0],
[3,2,0,"Contrareferencia",1,0],
[3,2,0,"Docencia e Investigación",1,0],
[3,2,0,"Educación Individual",1,0],
[3,2,0,"Gestión de camas",1,0],
[3,2,0,"Gestión de Casos",1,0],
[3,2,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[3,2,0,"OANC Registros clínicos",0,0],
[3,2,0,"OANC Actividades administrativas",0,0],
[3,2,0,"OANC Administración de personal",0,0],
[3,2,0,"OANC Comité de apoyo a la gestión",0,0],
[3,2,0,"OANC Comité de programación",0,0],
[3,2,0,"OANC Comité paritario",0,0],
[3,2,0,"Otras Actividades Clínicas",1,0],
[3,2,0,"Otras Actividades No Clínicas",0,0],
[3,2,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[3,2,0,"Procedimientos Invasivos (Propios)",1,0],
[3,2,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[3,2,0,"Procedimientos No Invasivos (Propios)",1,0],
[3,2,0,"Reunión Clínica",1,0],
[3,2,0,"Reunión Técnica Administrativa",0,0],
[0,6,0,"Comité Oncológico",1,0],
[0,6,0,"Reunión Clínica",1,0],
[0,7,0,"Reunión Clínica",1,0],
[0,8,0,"Reunión Clínica",1,0],
[1,3,0,"Evaluación inicial PRESENCIAL",1,0],
[1,3,0,"Evaluación intermedia PRESENCIAL",1,0],
[1,3,0,"Sesiones de Rehabilitación PRESENCIAL",1,0],
[0,8,0,"Evaluación inicial PRESENCIAL",1,1],
[0,8,0,"Sesiones de Rehabilitación PRESENCIAL",1,1],
[0,8,0,"Evaluación Intermedia remota",1,1],
[0,8,0,"Sesiones de Rehabilitación a distancia",1,1],
[1,5,0,"Atención Nutricional",1,0],
[0,8,0,"Consulta Control Presencial (ESPECIALIDADES)",1,1],
[0,8,0,"Consulta Nueva Presencial (ESPECIALIDADES)",1,1],
[0,8,0,"Gestión de Casos",1,1],
[0,8,0,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,8,0,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,8,0,"Telemedicina: Teleconsulta Control",1,1],
[0,8,0,"Telemedicina: Teleconsulta Nueva",1,1],
[0,8,0,"Visita Domiciliaria",1,1],
[0,8,0,"Contacto telefónico: Consulta Control",1,1],
[0,1,0,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,1,0,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,1,0,"Telemedicina: Teleconsulta Control",1,1],
[0,1,0,"Telemedicina: Teleconsulta Nueva",1,1],
[0,1,0,"Consulta Ingreso Equipo de Salud Mental",1,1],
[0,1,0,"Consultoría en Salud Mental (Presencial)",1,0],
[0,3,0,"Telemedicina Control (Teleinterconsulta sincrónica)",1,1],
[0,3,0,"Telemedicina Nueva (teleinterconsulta Sincrónica)",1,1],
[0,8,0,"Sesión de rehabilitación vía remota (Telerehabilitación)",1,1],
[0,3,0,"Evaluación de Ayuda Técnica (NUEVA )",1,1],
[0,3,0,"Entrega de Ayuda Técnica (NUEVA )",1,1],
[0,3,0,"Entrenamiento de Ayuda Técnica (NUEVA )",1,1],
[1,3,0,"Evaluación de Ayuda Técnica (NUEVA )",1,1],
[1,3,0,"Entrega de Ayuda Técnica (NUEVA )",1,1],
[1,3,0,"Entrenamiento de Ayuda Técnica (NUEVA )",1,1],
[1,4,0,"Docencia e Investigación",1,0],
[1,4,0,"Evaluación de Ayuda Técnica (NUEVA )",1,1],
[1,4,0,"Entrega de Ayuda Técnica (NUEVA )",1,1],
[1,4,0,"Entrenamiento de Ayuda Técnica (NUEVA )",1,1],
[1,4,0,"Evaluación inicial PRESENCIAL",1,0],
[1,4,0,"Evaluación intermedia PRESENCIAL",1,0],
[1,4,0,"Gestión de Casos",1,0],
[1,4,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,4,0,"OANC Registros clínicos",0,0],
[1,4,0,"OANC Actividades administrativas",0,0],
[1,4,0,"OANC Administración de personal",0,0],
[1,4,0,"OANC Comité de apoyo a la gestión",0,0],
[1,4,0,"Otras Actividades Clínicas",1,0],
[1,4,0,"Otras Actividades No Clínicas",0,0],
[1,4,0,"Procedimientos Invasivos (apoyo Medicos)",1,0],
[1,4,0,"Procedimientos Invasivos (Propios)",1,0],
[1,4,0,"Procedimientos No Invasivos (apoyo Medicos)",1,0],
[1,4,0,"Procedimientos No Invasivos (Propios)",1,0],
[1,4,0,"Reunión Clínica",1,0],
[1,4,0,"Sesiones de Rehabilitación PRESENCIAL",1,0],
[0,4,0,"Entrega de Ayuda Técnica (NUEVA )",1,1],
[0,4,0,"Entrenamiento de Ayuda Técnica (NUEVA )",1,1],
[0,4,0,"Evaluación de Ayuda Técnica (NUEVA )",1,1],
[0,8,0,"Taller Grupal",1,0],
[0,8,0,"Entrega de Ayuda Técnica (NUEVA )",1,1],
[0,8,0,"Entrenamiento de Ayuda Técnica (NUEVA )",1,1],
[0,8,0,"Evaluación de Ayuda Técnica (NUEVA )",1,1],
[0,7,0,"Consulta Nueva Presencial (SM)",1,1],
[1,8,0,"Sesiones de Rehabilitación PRESENCIAL",1,0],
[1,8,0,"Otras Actividades Clínicas",1,0],
[1,8,0,"OANC Actividades administrativas",0,0],
[1,8,0,"Atención de Enlace o Interconsulta a sala",1,0],
[1,8,0,"Reunión Técnica Administrativa",0,0],
[1,8,0,"Otras Actividades No Clínicas",0,0],
[1,8,0,"Reunión Clínica",1,0],
[1,8,0,"Evaluación inicial PRESENCIAL",1,0],
[1,8,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,0],
[1,8,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[1,8,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,8,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[1,8,0,"Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)",1,0],
[1,8,0,"Coordinación con Equipos de la red de salud (PCI/ SM)",0,0],
[1,8,0,"Consejo Técnico de Salud Mental en el Servicio de Salud (SM)",0,0],
[1,8,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,0],
[1,8,0,"Evaluación intermedia PRESENCIAL",1,0],
[1,8,0,"Comité clínico",1,0],
[1,8,0,"Docencia e Investigación",1,0],
[1,8,0,"Actividades de cuidado del equipo",0,0],
[1,8,0,"Visita Integral de Salud Mental Hospital de Día y UHCIP (SM)",1,0],
[1,4,0,"Actividades de cuidado del equipo",0,0],
[1,4,0,"Reunión Técnica Administrativa",0,0],
[1,3,0,"Actividades de cuidado del equipo",0,0],
[1,3,0,"Reunión Técnica Administrativa",0,0],
[1,1,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,0],
[1,1,0,"Reunión Técnica Administrativa",0,0],
[1,1,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,0],
[1,6,0,"Otras Actividades Clínicas",1,0],
[1,6,0,"Atención de Enlace o Interconsulta a sala",1,0],
[1,6,0,"Psicoterapia Individual (SM) (incluye presencial y remoto)",1,0],
[1,6,0,"Psicodiagnóstico",1,0],
[1,6,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,6,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,0],
[1,6,0,"Otras Actividades No Clínicas",0,0],
[1,6,0,"Reunión Clínica",1,0],
[1,6,0,"Reunión Técnica Administrativa",0,0],
[1,6,0,"Intervención Psicosocial Grupal Hospital de Día y UHCIP (SM)",1,0],
[1,6,0,"Intervención Familiar Hospital de Día y UHCIP (SM)",1,0],
[1,6,0,"Ronda otro establecimiento",1,0],
[1,6,0,"Sesiones de Rehabilitación PRESENCIAL",1,0],
[1,6,0,"Actividades de cuidado del equipo",0,0],
[1,6,0,"Gestión de Casos SM",1,0],
[1,6,0,"Educación Individual",1,0],
[1,5,0,"Otras Actividades No Clínicas",0,0],
[1,5,0,"Reunión Clínica",1,0],
[1,5,0,"Otras Actividades Clínicas",1,0],
[1,5,0,"Gestión Organizacional (Administrativo/ Jefatura)",0,0],
[1,5,0,"Consulta Control Hospital de Día y UHCIP (SM)",1,0],
[1,5,0,"Reunión Técnica Administrativa",0,0],
[1,5,0,"Procedimientos No Invasivos (Propios)",1,0],
[1,5,0,"OANC Actividades administrativas",0,0],
[1,5,0,"Docencia e Investigación",1,0],
[1,5,0,"Atención Nutricional en Sala",1,0],
[1,5,0,"Educación nutricional establecimiento o/y espacios públicos.",1,0],
[1,5,0,"Atención Nutricional Intensiva (ANI)",1,0],
[1,5,0,"OANC Administración de personal",0,0],
[1,5,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,0],
[1,6,0,"Consulta Ingreso Hospital de Día y UHCIP (SM)",1,0],
[0,6,0,"Consulta Control Presencial (ESPECIALIDADES)",1,1],
[0,6,0,"Consulta Nueva Presencial (ESPECIALIDADES)",1,1],
[2,1,0,"Gestión prequirúrgica",1,0],
[2,1,0,"Gestión tabla quirúrgica",1,0],
[2,2,0,"Gestión prequirúrgica",1,0],
[2,2,0,"Gestión tabla quirúrgica",1,0],
[0,1,0,"Evaluación inicial PRESENCIAL",1,1],
[0,1,0,"Consulta Control Presencial (SM)",1,1],
[0,3,0,"Visita Domiciliaria",1,1],
[0,2,0,"Consulta Control Presencial (SM)",1,1],
[0,2,0,"Consulta Control Salud Mental",1,1],
[0,6,0,"Consulta Control Presencial (SM)",1,1],
[0,8,0,"Consulta Control Presencial (SM)",1,1],
[0,8,0,"Evaluación intermedia PRESENCIAL",1,1],
[0,8,0,"Consultoría en salud",1,0],
[0,6,0,"Consulta Abreviada no Médica",1,1],
[0,8,0,"Confección de ortesis.",1,0],
[1,8,0,"Confección de ortesis.",1,0],
[1,1,0,"Atención de Enlace o Interconsulta a sala",1,0],
[0,3,0,"Evaluación inicial remota",1,1],
[0,8,0,"Evaluación inicial remota",1,1],
[0,4,0,"Evaluación inicial remota",1,1],
[0,6,0,"Evaluación inicial remota",1,1],
[0,1,0,"Evaluación inicial remota",1,1],
[0,3,0,"Evaluación inicial en domicilio (NUEVA)",1,1],
[0,8,0,"Evaluación inicial en domicilio (NUEVA)",1,1],
[0,4,0,"Evaluación inicial en domicilio (NUEVA)",1,1],
[0,6,0,"Evaluación inicial en domicilio (NUEVA)",1,1],
[0,1,0,"Evaluación inicial en domicilio (NUEVA)",1,1],
[0,3,0,"Evaluación intermedia en domicilio (NUEVA)",1,1],
[0,8,0,"Evaluación intermedia en domicilio (NUEVA)",1,1],
[0,4,0,"Evaluación intermedia en domicilio (NUEVA)",1,1],
[0,6,0,"Evaluación intermedia en domicilio (NUEVA)",1,1],
[0,3,0,"Sesiones de Rehabilitación en domicilio (NUEVA)",1,1],
[0,8,0,"Sesiones de Rehabilitación en domicilio (NUEVA)",1,1],
[0,4,0,"Sesiones de Rehabilitación en domicilio (NUEVA)",1,1],
[0,6,0,"Sesiones de Rehabilitación en domicilio (NUEVA)",1,1],
[3,2,0,"Atención de Servicio de Urgencia C1 (Obs)",1,1],
[3,2,0,"Atención de Servicio de Urgencia C2 (Obs)",1,1],
[3,2,0,"Atención de Servicio de Urgencia C3 (Obs)",1,1],
[3,2,0,"Atención de Servicio de Urgencia C4 (Obs)",1,1],
[3,2,0,"Atención de Servicio de Urgencia C5 (Obs)",1,1],
[3,2,0,"Triage Gineco Obstétrico C1-C5",1,1],
[1,2,0,"Categorización CUDYR",1,1],
[1,1,0,"Categorización CUDYR",1,1],
[1,1,0,"Atención en sala cama básica pediátrica",1,1],
[1,1,0,"Atención en sala cama media pediátrica",1,1],
[1,1,0,"Atención en sala cama UCI pediátrica",1,1],
[1,1,0,"Atención en sala cama UTI pediátrica",1,1],
[1,1,0,"Atención en sala cama básica Neo",1,1],
[1,1,0,"Atención en sala cama UTI Neo",1,1],
[1,1,0,"Atención en sala cama UCI Neo",1,1],
[1,1,0,"Atención en sala cama UTI Adulto",1,1],
[1,1,0,"Atención en sala cama UCI Adulto",1,1],
[1,1,0,"Atención en sala cama media Adulto",1,1],
[1,1,0,"Atención en sala cama básica Adulto",1,1],
[1,1,0,"Atención en sala cama Psiquiátrica",1,1],
[0,1,0,"Atención domiciliaria",1,1],
[0,4,0,"Atención domiciliaria",1,1],
[0,2,0,"Atención domiciliaria",1,1],
[0,5,0,"Atención domiciliaria",1,1],
[0,6,0,"Atención domiciliaria",1,1],
[0,8,0,"Atención domiciliaria",1,1],
[0,3,0,"Atención domiciliaria",1,1],
[0,6,0,"Acreditación por ingreso a PRAIS",1,1],
[0,6,0,"Consulta de ingreso a equipo PRAIS",1,1],
[0,6,0,"Consulta Nueva PRAIS",1,1],
[0,6,0,"Consulta Control PRAIS",1,1],
[0,6,0,"Psicoterapia Individual PRAIS",1,1],
[0,6,0,"Acompañamiento Psicosocial PRAIS",1,1],
[0,6,0,"Atención Domiciliaria Integral PRAIS",1,1],
[0,6,0,"Psicoterapia Familiar PRAIS",1,1],
[0,6,0,"Psicoterapia Grupal PRAIS",1,1],
[0,6,0,"Intervención Psicosocial Grupal PRAIS",1,1],
[0,6,0,"Acompañamiento a familias en proceso de restitución de restos óseos identificados a sus familiares",1,1],
[0,6,0,"Acompañamiento en terreno en sitios de interés",1,1],
[0,6,0,"Atención domiciliaria para búsqueda activa de familiares",1,1],
[3,1,0,"Atención de Servicio de Urgencia C1 (Obs)",1,1],
[3,1,0,"Atención de Servicio de Urgencia C2 (Obs)",1,1],
[3,1,0,"Atención de Servicio de Urgencia C3 (Obs)",1,1],
[3,1,0,"Atención de Servicio de Urgencia C5 (Obs)",1,1],
[3,1,0,"Atención de Servicio de Urgencia C4 (Obs)",1,1],
[1,2,0,"Atención en sala cama básica pediátrica",1,1],
[1,2,0,"Atención en sala cama media pediátrica",1,1],
[1,2,0,"Atención en sala cama UCI pediátrica",1,1],
[1,2,0,"Atención en sala cama UTI pediátrica",1,1],
[1,2,0,"Atención en sala cama básica Neo",1,1],
[1,2,0,"Atención en sala cama UTI Neo",1,1],
[1,2,0,"Atención en sala cama UCI Neo",1,1],
[1,2,0,"Atención en sala cama UTI Adulto",1,1],
[1,2,0,"Atención en sala cama UCI Adulto",1,1],
[1,2,0,"Atención en sala cama media Adulto",1,1],
[1,2,0,"Atención en sala cama básica Adulto",1,1],
[1,2,0,"Atención en sala cama Psiquiátrica",1,1],
[0,1,0,"Capacitación avance tecnológico",1,1],
[0,4,0,"Capacitación avance tecnológico",1,1],
[0,3,0,"Capacitación avance tecnológico",1,1],
[0,2,0,"Capacitación avance tecnológico",1,1],
[0,5,0,"Capacitación avance tecnológico",1,1],
[0,6,0,"Capacitación avance tecnológico",1,1],
[0,7,0,"Capacitación avance tecnológico",1,1],
[0,8,0,"Capacitación avance tecnológico",1,1],
[1,1,0,"Capacitación avance tecnológico",1,1],
[1,3,0,"Capacitación avance tecnológico",1,1],
[1,2,0,"Capacitación avance tecnológico",1,1],
[2,1,0,"Capacitación avance tecnológico",1,1],
[2,2,0,"Capacitación avance tecnológico",1,1],
[3,1,0,"Capacitación avance tecnológico",1,1],
[3,3,0,"Capacitación avance tecnológico",1,1],
[3,2,0,"Capacitación avance tecnológico",1,1],
[1,5,0,"Capacitación avance tecnológico",1,1],
[1,4,0,"Capacitación avance tecnológico",1,1],
[1,8,0,"Capacitación avance tecnológico",1,1],
[1,6,0,"Capacitación avance tecnológico",1,1]
];

let CATALOGO_ACTIVIDADES = CATALOGO_RAW.map(([p, pr, e, act, clin, rend]) => ({
  proceso: PROCESOS_CAT[p],
  profesion: PROFESIONES_CAT[pr],
  especialidad: ESPECIALIDADES_CAT[e],
  actividad: act,
  clinica: !!clin,
  tieneRendimiento: !!rend,
}));

// El listado original trae "Egresos cama X" y "Atención en sala cama X" desglosados por tipo de cama
// (pediátrica, Neo, UCI, UTI, Adulto, Psiquiátrica), pero en la práctica nadie programa a ese nivel de detalle.
// Se quitan los egresos por completo y se deja "Atención en sala" como una sola prestación genérica,
// más "Interconsulta" (que tampoco existía de forma simple), para cada especialidad médica real.
CATALOGO_ACTIVIDADES = CATALOGO_ACTIVIDADES.filter(
  (a) => !a.actividad.startsWith('Egresos cama') && !a.actividad.startsWith('Atención en sala cama')
);
ESPECIALIDADES_CAT.filter((e) => e !== 'No Aplica').forEach((especialidad) => {
  CATALOGO_ACTIVIDADES.push(
    { proceso: 'Hospitalizado', profesion: 'Médico(a) Cirujano(a)', especialidad, actividad: 'Atención en sala', clinica: true, tieneRendimiento: true },
    { proceso: 'Hospitalizado', profesion: 'Médico(a) Cirujano(a)', especialidad, actividad: 'Interconsulta', clinica: true, tieneRendimiento: true }
  );
});

const ESPECIALIDAD_POR_SERVICIO = {
  'Cardiología': 'CARDIOLOGÍA ADULTO',
  'Oftalmología': 'OFTALMOLOGÍA',
  'Traumatología': 'TRAUMATOLOGÍA Y ORTOPEDIA ADULTO',
  'Medicina Interna': 'MEDICINA INTERNA',
  'Otorrinolaringología': 'OTORRINOLARINGOLOGÍA',
  'Ginecología': 'GINECOLOGÍA ADULTO',
  'Genética Clínica': 'GENÉTICA CLÍNICA',
  'Endoscopia y Gastroenterología': 'GASTROENTEROLOGÍA ADULTO',
  'Neonatología': 'NEONATOLOGÍA',
  'Geriatría': 'GERIATRÍA',
  'Nefrología Adulto': 'NEFROLOGÍA ADULTO',
  'Terapeuta Ocupacional': 'No Aplica',
  'Cirugía Adulto': 'CIRUGÍA GENERAL ADULTO',
  'Cuidados Paliativos': 'MEDICINA PALIATIVA',
  'Pediatría': 'PEDIATRÍA',
  'Enfermedad Respiratoria Pediátrica (Broncopulmonar Infantil)': 'ENFERMEDAD RESPIRATORIA PEDIÁTRICA (BRONCOPULMONAR INFANTIL)',
  'Cardiología Pediátrica': 'CARDIOLOGÍA PEDIÁTRICA',
  'Gastroenterología Pediátrica': 'GASTROENTEROLOGÍA PEDIÁTRICA',
  'Nefrología Pediátrica': 'NEFROLOGÍA PEDIÁTRICA',
  'Neurología Pediátrica': 'NEUROLOGÍA PEDIÁTRICA',
  'Nutriólogo Pediátrico': 'NUTRIÓLOGO PEDIÁTRICO',
  'Reumatología Pediátrica': 'REUMATOLOGÍA PEDIÁTRICA',
  'Endocrinología Pediátrica': 'ENDOCRINOLOGÍA PEDIÁTRICA',
};

// Rendimientos oficiales por hora (RPE N°21 - Orientaciones para la Planificación y Programación en Red, MINSAL 2026)
// para consulta nueva, consulta control y teleconsulta/teleinterconsulta sincrónica presencial, por especialidad médica.
// También el % de horas médicas que la orientación sugiere destinar a atención ambulatoria. Es la referencia NACIONAL.
const RENDIMIENTO_MINSAL_MEDICO = {
  'CARDIOLOGÍA ADULTO': { consultaNueva: 3, consultaControl: 4, telesincronica: 3, pctAmbulatorio: 60 },
  'OFTALMOLOGÍA': { consultaNueva: 3, consultaControl: 4, telesincronica: 4, pctAmbulatorio: 60 },
  'TRAUMATOLOGÍA Y ORTOPEDIA ADULTO': { consultaNueva: 4, consultaControl: 4, telesincronica: 4, pctAmbulatorio: 50 },
  'MEDICINA INTERNA': { consultaNueva: 3.5, consultaControl: 4, telesincronica: 4, pctAmbulatorio: 70 },
  'OTORRINOLARINGOLOGÍA': { consultaNueva: 3, consultaControl: 4, telesincronica: 4, pctAmbulatorio: 50 },
  'GINECOLOGÍA ADULTO': { consultaNueva: 3, consultaControl: 4, telesincronica: 3, pctAmbulatorio: 50 },
};

// Rendimientos LOCALES vigentes para Servicio de Salud Coquimbo (Ord. N°0214, 03-feb-2025), que ajustan el estándar
// nacional a la realidad local — este es el que rige para el Hospital San Juan de Dios de La Serena. Incluye el tiempo
// por paciente sugerido (minutos). Según el propio oficio, rige igual para atención presencial y remota (teleconsulta).
const RENDIMIENTO_LOCAL_COQUIMBO = {
  'CARDIOLOGÍA ADULTO': { consultaNueva: 3, consultaControl: 3, duracionNueva: 20, duracionControl: 20 },
  'OFTALMOLOGÍA': { consultaNueva: 4, consultaControl: 4, duracionNueva: 15, duracionControl: 15 },
  'TRAUMATOLOGÍA Y ORTOPEDIA ADULTO': { consultaNueva: 3, consultaControl: 4, duracionNueva: 20, duracionControl: 15 },
  'MEDICINA INTERNA': { consultaNueva: 3, consultaControl: 3, duracionNueva: 20, duracionControl: 20 },
  'OTORRINOLARINGOLOGÍA': { consultaNueva: 3, consultaControl: 4, duracionNueva: 20, duracionControl: 15 },
  'GINECOLOGÍA ADULTO': { consultaNueva: 3, consultaControl: 4, duracionNueva: 20, duracionControl: 15 },
};

// Determina el rendimiento sugerido para una actividad médica: prioriza el estándar LOCAL de Coquimbo (Ord. N°0214)
// por sobre el nacional MINSAL, ya que es el vigente y de implementación obligatoria para este hospital.
// Si no corresponde a una prestación con rendimiento oficial (consulta nueva, control o teleconsulta), devuelve null.
function rendimientoSugeridoMinsal(tipoProfesional, especialidad, actividad) {
  if (tipoProfesional !== 'Médico(a) Cirujano(a)') return null;
  const local = RENDIMIENTO_LOCAL_COQUIMBO[especialidad];
  const nacional = RENDIMIENTO_MINSAL_MEDICO[especialidad];
  if (actividad === 'Consulta Nueva de especialidad Presencial') {
    return local ? local.consultaNueva : (nacional ? nacional.consultaNueva : null);
  }
  if (actividad === 'Consulta Control de especialidad Presencial') {
    return local ? local.consultaControl : (nacional ? nacional.consultaControl : null);
  }
  if (actividad === 'Telemedicina Control (Teleinterconsulta sincrónica)') {
    // El Ord. N°0214 indica que el mismo rendimiento aplica a atención presencial y remota (punto 1.5)
    return local ? local.consultaControl : (nacional ? nacional.telesincronica : null);
  }
  return null;
}

const COLOR_PROCESO = { Ambulatorio: '#3B6FA0', Hospitalizado: '#0F6E56', Quirúrgico: '#7A5CC7', Urgencia: '#B6522F' };

// Actividades disponibles para un profesional (según su profesión) dentro de la especialidad del servicio,
// más las actividades transversales ("No Aplica") de esa misma profesión.
function actividadesPara(tipoProfesional, especialidad) {
  return CATALOGO_ACTIVIDADES.filter(
    (a) => a.profesion === tipoProfesional && (a.especialidad === especialidad || a.especialidad === 'No Aplica')
  );
}

const TIPOS_PROFESIONAL = PROFESIONES_CAT;

// Jefe de Servicio asociado a la cuenta con la que se inicia sesión (simulado aquí vía el selector de servicio)
const JEFES_POR_SERVICIO = {
  'Cardiología': 'Dr. Rojas',
  'Oftalmología': 'Dra. Molina',
  'Traumatología': 'Dr. Peña',
  'Medicina Interna': 'Dra. Vidal',
  'Otorrinolaringología': 'Dr. Campos',
  'Ginecología': 'Dra. Herrera',
  'Genética Clínica': 'Dra. Zeppelin',
  'Endoscopia y Gastroenterología': 'Dra. Haberle',
  'Neonatología': 'Dr. Carvajal',
  'Geriatría': 'Dra. Elgueta',
  'Nefrología Adulto': 'Dr. Castro',
  'Terapeuta Ocupacional': 'Sra. Olivares',
  'Cirugía Adulto': 'Dr. Lima',
  'Cuidados Paliativos': 'Dra. Ramirez',
};

// Personas reales del Comité de Programación, Oferta y Demanda (Resolución RES/2226-2026, HSJD La Serena)
const PERSONA_POR_ROL = {
  referente_programacion: 'Ing. Gabriela Zapata Pinto',
  subdirector: 'Dr. Roger Bitrán Parada',
  admision: 'MT. Alejandra Ríos Espinoza',
};

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Bloques de media hora entre las 08:00 y las 20:00
function generarBloques(horaInicio, horaFin, pasoMin) {
  const out = [];
  const fmt = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  for (let t = horaInicio * 60; t < horaFin * 60; t += pasoMin) {
    out.push(`${fmt(t)}–${fmt(t + pasoMin)}`);
  }
  return out;
}
const BLOQUES = generarBloques(8, 20, 30);

// Capacidad de infraestructura disponible por bloque (horas-box). Ajustar según boxes/pabellones reales del hospital.
function capacidadPorBloque(dia, bloque) {
  const horaInicio = parseInt(bloque.slice(0, 2), 10);
  if (dia === 'Sábado') return horaInicio < 13 ? 3 : 0;
  if (horaInicio === 13) return 1; // colación, capacidad reducida
  return 5;
}
const INFRAESTRUCTURA_CAPACIDAD = {};
DIAS.forEach((dia) => {
  INFRAESTRUCTURA_CAPACIDAD[dia] = {};
  BLOQUES.forEach((b) => { INFRAESTRUCTURA_CAPACIDAD[dia][b] = capacidadPorBloque(dia, b); });
});

const ROLES = {
  admin: { label: 'Administrador', color: '#8A5A44' },
  jefe_servicio: { label: 'Jefe de Servicio', color: '#4C7C74' },
  referente_programacion: { label: 'Referente de Programación', color: '#B8862E' },
  admision: { label: 'Admisión', color: '#3B6FA0' },
  subdirector: { label: 'Subdirector Atención Ambulatoria', color: '#7A5CC7' },
};

const ESTADOS = {
  borrador: { label: 'Borrador', color: '#8A97A0', bg: '#F1F3F4' },
  enviada: { label: 'Enviada', color: '#3B6FA0', bg: '#EAF1F8' },
  escalada: { label: 'Escalada a Subdirección', color: '#7A5CC7', bg: '#F1EDFB' },
  rechazada: { label: 'Rechazada', color: '#B6522F', bg: '#FBEEE8' },
  aprobada: { label: 'Aprobada', color: '#4C7C74', bg: '#EBF5F2' },
  subida_alma: { label: 'Subida a ALMA', color: '#1E2E33', bg: '#EAECED' },
};

const COLUMN_ORDER = ['borrador', 'enviada', 'escalada', 'rechazada', 'aprobada', 'subida_alma'];

const DOCS_NORMATIVOS = [
  {
    titulo: 'PAC EAR 2025 — Plan de Acción Correctivo',
    resumen: 'Establece los compromisos institucionales tras la evaluación EAR 2025 (59,82% de cumplimiento BSC). Define que toda agenda ambulatoria debe quedar registrada y trazable desde su envío por el Jefe de Servicio hasta su carga en ALMA, con responsable y fecha en cada etapa.',
  },
  {
    titulo: 'Procedimiento de aprobación de agendas — Referente de Programación',
    resumen: 'El Referente de Programación revisa la coherencia de horas programadas en los cuatro procesos del catálogo institucional (Ambulatorio, Hospitalizado, Quirúrgico y Urgencia), según las prestaciones reales habilitadas para cada profesión y especialidad. Si el requerimiento excede sus atribuciones, debe escalar a Subdirección de Atención Ambulatoria o Cerrada según corresponda.',
  },
  {
    titulo: 'Estándar de indicadores de agenda ambulatoria',
    resumen: 'El %CNE (Consultas No Efectuadas) se reporta directamente desde el sistema de agendamiento; no debería superar el 8% como referencia de buen funcionamiento, y un valor mayor al 15% debe quedar destacado para seguimiento de DDI. El rendimiento se calcula como atenciones realizadas dividido por el total de horas programadas en la agenda, sumando los cuatro procesos.',
  },
  {
    titulo: 'RPE N°21 (MINSAL 2026) — Criterios Técnicos para la Programación de la Atención Ambulatoria de Especialidades',
    resumen: 'Orientación oficial del Ministerio de Salud con dos referencias: (1) % de horas médicas sugerido para atención ambulatoria por especialidad — Cardiología 60%, Oftalmología 60%, Traumatología y Ortopedia 50%, Medicina Interna 70%, Otorrinolaringología 50%, Ginecología 50% — y (2) rendimientos oficiales por hora para consulta médica presencial: Cardiología (nueva 3, control 4), Oftalmología (nueva 3, control 4), Traumatología (nueva 4, control 4), Medicina Interna (nueva 3 a 4, control 4), Otorrinolaringología (nueva 3, control 4), Ginecología (nueva 3, control 4); teleconsulta/teleinterconsulta sincrónica entre 3 y 4 según especialidad. Para profesionales no médicos también fija rendimientos: Enfermería (consulta nueva 2, control 3, consulta abreviada 8), Kinesiología (visita a sala 3, evaluación inicial 1,3), Nutrición (control 2, consulta nueva 45 minutos), entre otros. La definición de rendimientos puede ajustarse a la realidad local, pero esa decisión debe ser validada por el Comité de Programación del establecimiento y por el Servicio de Salud respectivo.',
  },
  {
    titulo: 'Ord. N°0214 (03-feb-2025) — Rendimientos locales de consulta nueva y control, Servicio de Salud Coquimbo',
    resumen: 'Oficio del Director del Servicio de Salud Coquimbo a los hospitales de mediana y alta complejidad de la red (incluye Hospital San Juan de Dios de La Serena), que fija los rendimientos MÍNIMOS locales para consulta nueva y consulta control, ajustados a la realidad de la red de Coquimbo, con implementación total exigida en las agendas médicas. Este estándar LOCAL prevalece por sobre la referencia nacional del RPE N°21 para este hospital, y fue definido de común acuerdo con los establecimientos. Valores para las especialidades de este servicio: Cardiología Adulto (nueva 3 y control 3, 20 min cada una), Oftalmología (nueva 4 y control 4, 15 min cada una), Traumatología y Ortopedia Adulto (nueva 3 y control 4, 20 y 15 min), Medicina Interna (nueva 3 y control 3, 20 min cada una — con rendimiento diferenciado para pacientes NANEAS), Otorrinolaringología (nueva 3 y control 4, 20 y 15 min), Ginecología Adulto (nueva 3 y control 4, 20 y 15 min). Los rendimientos aplican igual para atención presencial y remota (teleconsulta), y serán evaluados anualmente según el comportamiento de la demanda. Si una especialidad ya rinde por sobre el mínimo, se le solicita mantener su rendimiento actual — no bajarlo a este piso.',
  },
  {
    titulo: 'Resolución RES/2226-2026 — Comité de Programación, Oferta y Demanda, Hospital San Juan de Dios de La Serena',
    resumen: 'Actualiza la constitución del Comité de Programación del hospital. El Director (Ing. Luis Marín Campusano) es responsable de la programación definitiva. El Subdirector de Gestión Clínica de Atención Ambulatoria (Dr. Roger Bitrán Parada) y el Subdirector de Gestión Clínica de Atención Cerrada (Dr. Sergio Puebla Molina) son responsables de la gestión y ajustes de programación de sus áreas. La Referente Institucional del Proceso de Programación (Ing. Gabriela Zapata Pinto) es responsable técnico y operativo de la programación médica y no médica de la institución. El proceso institucional sigue el flujo: Comité de Programación (determina demanda, oferta y brechas) → Referente de Programación (recibe orientaciones, coordina con equipos, elabora y envía la planilla de programación al Servicio de Salud Coquimbo) → Jefes de Servicio (envían y ejecutan su propuesta de programación) → Admisión/Gestión de Camas (operativiza la programación) → Subdirectores (implementan y hacen seguimiento de estrategias). El comité debe reunirse periódicamente, dar seguimiento a indicadores de gestión, listas de espera y cumplimiento de la programación anual.',
  },
];

let idCounter = 100;

function nowStr() {
  return new Date().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Una agenda aprobada deja de estar vigente cuando su vigenciaHasta ya pasó — normalmente porque
// se aprobó una versión más nueva del mismo servicio, lo que cierra automáticamente la anterior.
function esVigente(agenda) {
  if (agenda.estado !== 'aprobada') return true;
  if (!agenda.vigenciaHasta) return true;
  return agenda.vigenciaHasta >= new Date().toISOString().slice(0, 10);
}

/* ---------------------------------------------------------
   Helpers para la estructura anidada de horas
--------------------------------------------------------- */

function horasVacias() {
  const h = {};
  PROCESOS_CAT.forEach((p) => (h[p] = 0));
  return h;
}

function totalHorasAgenda(horas) {
  return Object.values(horas).reduce((a, b) => a + b, 0);
}

function distribucionVacia() {
  const d = {};
  DIAS.forEach((dia) => {
    d[dia] = {};
    BLOQUES.forEach((b) => (d[dia][b] = 0));
  });
  return d;
}

// Patrón horario típico (más carga a media mañana y media tarde, baja en colación) para poblar datos de ejemplo
function patronBloque(bloque) {
  const h = parseInt(bloque.slice(0, 2), 10);
  if (h === 13) return 0.2;
  if (h >= 9 && h < 12) return 1;
  if (h >= 15 && h < 17) return 1;
  return 0.6;
}
function generarDistribucionEjemplo(escala) {
  const d = distribucionVacia();
  DIAS.forEach((dia) => {
    BLOQUES.forEach((b) => {
      let base = patronBloque(b) * escala;
      if (dia === 'Sábado') base = parseInt(b.slice(0, 2), 10) < 13 ? base * 0.4 : 0;
      d[dia][b] = Math.round(base * 10) / 10;
    });
  });
  return d;
}

// Escala continua de color para el mapa de calor: teal (bajo uso) -> ámbar -> rojo (sobre capacidad)
function heatColor(pct) {
  const clamped = Math.max(0, Math.min(pct, 130));
  const hue = 165 - (clamped / 130) * 165;
  const lightness = 88 - (clamped / 130) * 48;
  return { bg: `hsl(${hue}, 62%, ${lightness}%)`, text: lightness < 62 ? '#FFFFFF' : '#1E2E33' };
}

// Escala simple (casi blanco -> teal sólido) para mostrar la ocupación semanal de un solo profesional
function heatColorOcupacion(horasEnBloque) {
  const pct = Math.max(0, Math.min(1, horasEnBloque / 0.5));
  const lightness = 92 - pct * 50;
  return { bg: `hsl(165, 45%, ${lightness}%)` };
}

// Mapa de calor día×bloque de la capacidad REAL de pabellón (cantidad de pabellones asignados
// según la planilla de infraestructura), en el mismo formato visual que el heatmap de "horas
// programadas" de al lado — para poder comparar los dos mapas directamente, celda a celda, en
// vez de mezclar la capacidad dentro de un solo número de color combinado.
function CapacidadPabellonHeatmap({ grid }) {
  const maxCapacidad = Math.max(1, ...DIAS.flatMap((d) => BLOQUES.map((b) => grid[d]?.[b] || 0)));
  return (
    <div>
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Capacidad de pabellón (planilla de infraestructura)</div>
      <div className="bg-white rounded-xl border border-slate-200 p-3 overflow-x-auto">
        <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${DIAS.length}, 34px)`, gap: 3, width: 'max-content' }}>
          <div />
          {DIAS.map((dia) => (
            <div key={dia} className="text-[10px] text-slate-600 font-medium text-center">{dia.slice(0, 3)}</div>
          ))}
          {BLOQUES.map((b) => (
            <React.Fragment key={b}>
              <div className="text-[8px] text-slate-400 flex items-center justify-end pr-1">{b.slice(3, 5) === '00' ? b.slice(0, 2) : ''}</div>
              {DIAS.map((dia) => {
                const pabellones = grid[dia]?.[b] || 0;
                const pct = pabellones > 0 ? Math.max(35, (pabellones / maxCapacidad) * 100) : 0;
                const color = heatColor(pct);
                return (
                  <div
                    key={dia}
                    title={`${dia} ${b} — ${pabellones} pabellón${pabellones === 1 ? '' : 'es'} asignado${pabellones === 1 ? '' : 's'}`}
                    style={{ background: pabellones > 0 ? color.bg : '#F8FAFC', height: 16, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {pabellones > 0 && <span style={{ color: color.text, fontSize: 9, fontWeight: 600 }}>{pabellones}</span>}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="text-[11px] text-slate-400 mt-1.5">Número = cantidad de pabellones asignados a este servicio ese bloque, según la última planilla cargada en Infraestructura.</div>
    </div>
  );
}

// Agrupa las horas por actividad real (dinámico: depende de lo que cada profesional tenga cargado)
function horasPorActividad(bloques) {
  const map = {};
  bloques.forEach((b) => {
    if (b.esTurno) return;
    const key = b.actividad;
    map[key] = (map[key] || 0) + b.duracionMin / 60;
  });
  return Object.entries(map)
    .map(([actividad, horas]) => ({ actividad, horas: Math.round(horas * 10) / 10 }))
    .sort((a, b) => b.horas - a.horas);
}

// Igual que horasPorActividad, pero separa por proceso (una misma prestación puede existir en varios procesos)
// Clave para agrupar una prestación por nombre sin importar mayúsculas, tildes ni espacios
// (el catálogo trae variantes como "Comité clínico" / "Comité Clínico" o "(SM) (" / "(SM)(").
function claveActividad(actividad) {
  return (actividad || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s*([()/])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Horas por prestación agrupadas por NOMBRE (claveActividad), sumando todos los procesos en que
// aparece. `proceso` es el proceso con más horas (define el color); `procesos` trae el desglose.
function horasPorActividadYProceso(bloques) {
  const map = {};
  bloques.forEach((b) => {
    if (b.esTurno) return;
    const clave = claveActividad(b.actividad);
    if (!map[clave]) map[clave] = { clave, horas: 0, procesos: {}, variantes: {} };
    const h = b.duracionMin / 60;
    map[clave].horas += h;
    map[clave].procesos[b.proceso || 'Sin proceso'] = (map[clave].procesos[b.proceso || 'Sin proceso'] || 0) + h;
    map[clave].variantes[b.actividad] = (map[clave].variantes[b.actividad] || 0) + h;
  });
  return Object.values(map)
    .map((item) => {
      const mayor = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0][0];
      return {
        clave: item.clave,
        actividad: mayor(item.variantes),
        proceso: mayor(item.procesos),
        procesos: item.procesos,
        horas: Math.round(item.horas * 10) / 10,
      };
    })
    .sort((a, b) => b.horas - a.horas);
}

const formatoHoras = (v) => `${(Math.round((v || 0) * 10) / 10).toLocaleString('es-CL')} h`;
const recortarTexto = (t, max) => (t && t.length > max ? `${t.slice(0, max - 1)}…` : t || '');

// Horas (sin turno) por profesional, para el selector del mapa de calor. `claveDe(bloque)` da la
// misma clave que usan las opciones (en el resumen general combina agenda + profesional).
function horasPorClaveProfesional(bloques, claveDe) {
  const map = new Map();
  bloques.forEach((b) => {
    if (b.esTurno) return;
    const k = claveDe(b);
    map.set(k, (map.get(k) || 0) + b.duracionMin / 60);
  });
  return map;
}

// Selector múltiple de profesionales para armar el mapa de calor con uno o varios de ellos.
// opciones: [{ key, nombre, detalle? }]; horasPorKey: Map key -> horas (de lo que el mapa muestra).
function SelectorProfesionalesMapa({ opciones, horasPorKey, seleccion, setSeleccion }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const nombrePorKey = useMemo(() => new Map(opciones.map((o) => [o.key, o.nombre])), [opciones]);
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return opciones
      .filter((o) => !q || o.nombre.toLowerCase().includes(q) || (o.detalle || '').toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [opciones, busqueda]);
  const alternar = (key) => setSeleccion((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const horasSeleccion = seleccion.reduce((s, k) => s + (horasPorKey.get(k) || 0), 0);
  if (opciones.length < 2) return null;

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <button
            onClick={() => setAbierto((v) => !v)}
            className={`text-[11px] rounded-lg border px-2.5 py-1 flex items-center gap-1.5 ${seleccion.length ? 'border-[#4C7C74] text-[#2F6C5D] bg-[#EBF5F2] font-medium' : 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50'}`}
          >
            <Users size={12} />
            {seleccion.length === 0 ? `Profesionales: todos (${opciones.length})` : `${seleccion.length} profesional${seleccion.length === 1 ? '' : 'es'} · ${formatoHoras(horasSeleccion)}`}
            <ChevronDown size={12} />
          </button>
          {abierto && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
              <div className="absolute left-0 top-8 z-50 w-80 bg-white rounded-xl border border-slate-200 shadow-lg">
                <div className="p-2 border-b border-slate-100">
                  <input
                    autoFocus
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar profesional..."
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {visibles.length === 0 && <div className="px-3 py-3 text-xs text-slate-400 italic">Sin resultados.</div>}
                  {visibles.map((o) => (
                    <label key={o.key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={seleccion.includes(o.key)} onChange={() => alternar(o.key)} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs text-slate-700 truncate">{o.nombre}</span>
                        {o.detalle && <span className="block text-[10px] text-slate-400 truncate">{o.detalle}</span>}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">{formatoHoras(horasPorKey.get(o.key) || 0)}</span>
                    </label>
                  ))}
                </div>
                {seleccion.length > 0 && (
                  <div className="px-3 py-1.5 border-t border-slate-100 bg-[#EBF5F2] text-[11px] text-[#2F6C5D]">
                    Suma de {seleccion.length} profesional{seleccion.length === 1 ? '' : 'es'}: <b>{formatoHoras(horasSeleccion)}</b>
                  </div>
                )}
                <div className="flex justify-between items-center px-3 py-2 border-t border-slate-100">
                  <button onClick={() => setSeleccion([])} className="text-[11px] text-slate-500 hover:text-slate-700">Limpiar</button>
                  <button onClick={() => setAbierto(false)} className="text-[11px] font-medium text-[#4C7C74] hover:underline">Listo</button>
                </div>
              </div>
            </>
          )}
        </div>
        {seleccion.length > 0 && (
          <>
            {seleccion.map((k) => (
              <span key={k} className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 rounded-full pl-2 pr-1 py-0.5">
                {recortarTexto(nombrePorKey.get(k) || k, 28)}
                <button onClick={() => alternar(k)} className="text-slate-400 hover:text-slate-700" title="Quitar"><X size={10} /></button>
              </span>
            ))}
            <button onClick={() => setSeleccion([])} className="text-[11px] font-medium text-[#4C7C74] hover:underline">Ver todos los profesionales</button>
          </>
        )}
      </div>
    </div>
  );
}

// Gráfico de barras horizontales de horas por prestación (todas, no un top N), ordenable por
// horas o por nombre. Las barras son clicables para combinar prestaciones en la distribución
// horaria; "Ver todas las prestaciones" (arriba, junto al título) limpia esa selección.
function GraficoHorasPorPrestacion({ datos, seleccion, setSeleccion }) {
  const [orden, setOrden] = useState('horas');
  const [mostrar, setMostrar] = useState('top10'); // 'top10' | 'todas'
  const [busqueda, setBusqueda] = useState('');
  // La búsqueda ignora mayúsculas y tildes, y busca cada palabra por separado ("consulta control").
  const encontrados = useMemo(() => {
    const palabras = claveActividad(busqueda).split(' ').filter(Boolean);
    if (!palabras.length) return datos;
    return datos.filter((d) => {
      const texto = claveActividad(`${d.actividad} ${Object.keys(d.procesos || {}).join(' ')}`);
      return palabras.every((p) => texto.includes(p));
    });
  }, [datos, busqueda]);
  const recortado = mostrar === 'top10' && encontrados.length > 10;
  const ordenados = useMemo(() => {
    // Top 10 siempre son las 10 con más horas; después se aplica el orden elegido sobre ellas.
    const base = mostrar === 'top10' ? [...encontrados].sort((a, b) => b.horas - a.horas).slice(0, 10) : encontrados;
    const copia = [...base];
    if (orden === 'nombre') {
      copia.sort((a, b) => (a.actividad || '').localeCompare(b.actividad || '', 'es', { sensitivity: 'base' }) || (a.proceso || '').localeCompare(b.proceso || ''));
    } else {
      copia.sort((a, b) => b.horas - a.horas);
    }
    return copia;
  }, [encontrados, orden, mostrar]);
  const total = datos.reduce((s, d) => s + d.horas, 0);
  const totalEncontrados = encontrados.reduce((s, d) => s + d.horas, 0);
  const hayBusqueda = busqueda.trim().length > 0;
  const seleccionarEncontrados = () => setSeleccion((prev) => {
    const ya = new Set(prev.map((s) => s.clave));
    return [...prev, ...encontrados.filter((d) => !ya.has(d.clave)).map((d) => ({ clave: d.clave, proceso: Object.keys(d.procesos || {}).join(' + ') || d.proceso, actividad: d.actividad }))];
  });
  const estaSeleccionada = (e) => seleccion.some((s) => s.clave === e.clave);
  // Suma sobre todas las prestaciones (no solo las visibles en el top 10).
  const horasSeleccion = datos.filter(estaSeleccionada).reduce((s, d) => s + d.horas, 0);
  const alternar = (data) => setSeleccion((prev) => (
    prev.some((s) => s.clave === data.clave)
      ? prev.filter((s) => s.clave !== data.clave)
      : [...prev, { clave: data.clave, proceso: Object.keys(data.procesos || {}).join(' + ') || data.proceso, actividad: data.actividad }]
  ));

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Horas por prestación</div>
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{datos.length}</span>
          <span className="text-[10px] text-slate-400">
            {formatoHoras(total)} en total{recortado ? ` · mostrando las 10 con más horas de ${encontrados.length}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-400">Mostrar</span>
          <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
            {[{ id: 'top10', label: 'Top 10' }, { id: 'todas', label: 'Todas' }].map((o) => (
              <button
                key={o.id}
                onClick={() => setMostrar(o.id)}
                className={`text-[11px] px-2.5 py-1 ${mostrar === o.id ? 'bg-[#4C7C74] text-white font-medium' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-400 ml-1.5">Ordenar por</span>
          <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
            {[{ id: 'horas', label: 'N° de horas' }, { id: 'nombre', label: 'Nombre' }].map((o) => (
              <button
                key={o.id}
                onClick={() => setOrden(o.id)}
                className={`text-[11px] px-2.5 py-1 ${orden === o.id ? 'bg-[#4C7C74] text-white font-medium' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar prestación..."
            className="w-full text-xs rounded-lg border border-slate-300 pl-7 pr-7 py-1.5 bg-white focus:outline-none focus:border-[#4C7C74]"
          />
          {hayBusqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" title="Limpiar búsqueda">
              <X size={12} />
            </button>
          )}
        </div>
        {hayBusqueda && (
          <>
            <span className="text-[11px] text-slate-500">
              {encontrados.length} de {datos.length} prestaciones · <b className="text-slate-700">{formatoHoras(totalEncontrados)}</b>
              {total > 0 ? ` (${Math.round((totalEncontrados / total) * 100)}% del total)` : ''}
            </span>
            {encontrados.length > 0 && (
              <button onClick={seleccionarEncontrados} className="text-[11px] font-medium text-[#4C7C74] hover:underline">
                Ver estas en la distribución horaria
              </button>
            )}
          </>
        )}
      </div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex flex-wrap gap-3">
          {PROCESOS_CAT.map((p) => (
            <div key={p} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_PROCESO[p] }} />
              <span className="text-[10px] text-slate-500">{p}</span>
            </div>
          ))}
        </div>
        {seleccion.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[#4C7C74] bg-[#EBF5F2] px-2 py-0.5 rounded-full">
              {seleccion.length} {seleccion.length === 1 ? 'seleccionada' : 'seleccionadas'}
              {' · '}{formatoHoras(horasSeleccion)}
              {total > 0 ? ` (${Math.round((horasSeleccion / total) * 100)}% del total)` : ''}
            </span>
            <button onClick={() => setSeleccion([])} className="text-[11px] font-medium text-[#4C7C74] hover:underline">
              Ver todas las prestaciones
            </button>
          </div>
        ) : (
          <div className="text-[10px] text-slate-400">Haz clic en una o varias barras para verlas en la distribución horaria</div>
        )}
      </div>
      {hayBusqueda && encontrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-400 italic">
          Ninguna prestación coincide con “{busqueda.trim()}”.
        </div>
      ) : (
      <div className="bg-white rounded-xl border border-slate-200 p-3" style={{ height: Math.max(220, ordenados.length * 26 + 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ordenados} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 4 }} barCategoryGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v} h`} />
            <YAxis
              type="category"
              dataKey="actividad"
              width={260}
              interval={0}
              tick={({ x, y, payload }) => (
                <text x={x} y={y} dy={3.5} textAnchor="end" fontSize={10} fill="#334155">
                  <title>{payload.value}</title>
                  {recortarTexto(payload.value, 44)}
                </text>
              )}
            />
            <Tooltip
              cursor={{ fill: '#F1F5F9' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                const pct = (v) => (total > 0 ? ` (${Math.round((v / total) * 100)}%)` : '');
                return (
                  <div className="bg-white rounded-lg border border-slate-200 shadow-md px-3 py-2 text-[11px] max-w-xs">
                    <div className="font-semibold text-slate-800 mb-0.5">{d.actividad}</div>
                    <div className="text-slate-500">Total: <b className="text-slate-700">{formatoHoras(d.horas)}</b>{pct(d.horas)}</div>
                    {Object.keys(d.procesos || {}).length > 1 && (
                      <div className="mt-0.5 space-y-0.5">
                        {Object.entries(d.procesos).sort((a, b) => b[1] - a[1]).map(([p, h]) => (
                          <div key={p} className="flex items-center gap-1.5 text-slate-500">
                            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: COLOR_PROCESO[p] || '#94A3B8' }} />
                            {p}: {formatoHoras(h)}
                          </div>
                        ))}
                      </div>
                    )}
                    {Object.keys(d.procesos || {}).length === 1 && <div className="text-slate-400">{d.proceso}</div>}
                    {seleccion.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[#2F6C5D]">
                        Suma de {seleccion.length} seleccionada{seleccion.length === 1 ? '' : 's'}: <b>{formatoHoras(horasSeleccion)}</b>{pct(horasSeleccion)}
                        {!estaSeleccionada(d) && <div className="text-slate-400 mt-0.5">Clic para sumar esta: {formatoHoras(horasSeleccion + d.horas)}</div>}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Bar dataKey="horas" radius={[0, 4, 4, 0]} cursor="pointer" maxBarSize={18} onClick={alternar}>
              {ordenados.map((entry) => (
                <Cell
                  key={entry.clave}
                  fill={seleccion.length === 0 || estaSeleccionada(entry) ? COLOR_PROCESO[entry.proceso] || '#94A3B8' : '#E2E8F0'}
                />
              ))}
              <LabelList
                dataKey="horas"
                content={({ x, y, width, height, value }) => (
                  <text x={x + width + 6} y={y + height / 2} dy={3.5} fontSize={10} fill="#475569">{formatoHoras(value)}</text>
                )}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  );
}

const HORA_INICIO_DIA = 8;

// Topes de horario: dos bloques del MISMO profesional, el mismo día, cuyos horarios se cruzan
// (típico error de tipeo: 08:30-10:00 seguido de 09:30-...). Dos turnos entre sí no se cuentan.
// Devuelve Map idBloque -> [bloques con los que choca].
function detectarTopes(bloques) {
  const topes = new Map();
  const grupos = new Map();
  bloques.forEach((b) => {
    if (!b.duracionMin || b.duracionMin <= 0) return;
    const k = `${b.profesionalId}|||${b.dia}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(b);
  });
  grupos.forEach((lista) => {
    lista.sort((a, b) => a.inicioMin - b.inicioMin);
    for (let i = 0; i < lista.length; i++) {
      const a = lista[i];
      const finA = a.inicioMin + a.duracionMin;
      for (let j = i + 1; j < lista.length && lista[j].inicioMin < finA; j++) {
        const b = lista[j];
        if (a.esTurno && b.esTurno) continue;
        if (!topes.has(a.id)) topes.set(a.id, []);
        if (!topes.has(b.id)) topes.set(b.id, []);
        topes.get(a.id).push(b);
        topes.get(b.id).push(a);
      }
    }
  });
  return topes;
}

function describirTopes(lista) {
  return lista.map((o) => `${hhmmDesdeMin(o.inicioMin)}–${horaFinTexto(o.inicioMin, o.duracionMin)} ${o.actividad || (o.esTurno ? 'Turno' : 'sin prestación')}`).join(' · ');
}

// Duración que se asume al marcar un bloque como turno: 24 h por defecto. Si algún servicio
// trabaja con turnos más cortos se agrega aquí, ej. { neonatologia: 720 } para 12 h.
// Clave: nombre del servicio sin tildes, en minúsculas.
const DURACION_TURNO_POR_SERVICIO = {};
function duracionTurnoServicio(servicio) {
  const clave = String(servicio || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return DURACION_TURNO_POR_SERVICIO[clave] ?? 1440;
}

// Hora de término para mostrar: si pasa de medianoche (turnos de 24 h) se indica "+1d".
function horaFinTexto(inicioMin, duracionMin) {
  const fin = inicioMin + duracionMin;
  return fin > 1440 ? `${hhmmDesdeMin(fin % 1440)} (+1d)` : hhmmDesdeMin(fin);
}

function hhmmDesdeMin(mins) {
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

let bloqueIdCounter = 1000;
function nuevoBloqueId() { bloqueIdCounter += 1; return `bl${bloqueIdCounter}`; }
let profesionalIdCounter = 100;
function nuevoProfesionalId() { profesionalIdCounter += 1; return `prof${profesionalIdCounter}`; }
function M(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }

// Calcula día/hora/actividad por defecto para una fila nueva insertada entre "anterior" y "siguiente" (cualquiera puede ser null).
// Si no hay referencia, deja la prestación sin definir para que el profesional la elija explícitamente.
function calcularInsercion(anterior, siguiente) {
  const ref = anterior || siguiente;
  const duracion = ref ? ref.duracionMin : 30;
  let dia, inicioMin;
  if (anterior) {
    dia = anterior.dia;
    inicioMin = anterior.inicioMin + anterior.duracionMin;
  } else if (siguiente) {
    dia = siguiente.dia;
    inicioMin = Math.max(HORA_INICIO_DIA * 60, siguiente.inicioMin - duracion);
  } else {
    dia = 'Lunes';
    inicioMin = M('08:00');
  }
  return {
    dia, inicioMin, duracionMin: duracion,
    proceso: ref ? ref.proceso : null,
    actividad: ref ? ref.actividad : null,
    clinica: ref ? ref.clinica : true,
    tieneRendimiento: ref ? ref.tieneRendimiento : true,
    rendimiento: ref ? ref.rendimiento : 2,
    box: ref ? ref.box || '' : '',
    observaciones: '',
    esTurno: ref ? Boolean(ref.esTurno) : false,
  };
}

// Clona profesionales y bloques de una agenda base (última versión) generando ids nuevos, sin perder la referencia entre ambos
function clonarProfesionalesYBloques(base) {
  const mapaIds = {};
  const profesionales = base.profesionales.map((p) => {
    const nuevoId = nuevoProfesionalId();
    mapaIds[p.id] = nuevoId;
    return { id: nuevoId, nombre: p.nombre, tipo: p.tipo };
  });
  const bloques = base.bloquesProf.map((b) => ({ ...b, id: nuevoBloqueId(), profesionalId: mapaIds[b.profesionalId] }));
  return { profesionales, bloques };
}

// Deriva horas por proceso desde los bloques reales de cada profesional (duración variable).
// Los bloques de turno (Art. 15) no cuentan como horas de jornada — se excluyen acá para que
// ningún cálculo derivado (totales, dashboards, proyecciones) los mezcle sin querer.
function horasDesdeBloquesProf(bloques) {
  const h = horasVacias();
  bloques.forEach((b) => {
    if (b.esTurno) return;
    if (!b.proceso) return;
    h[b.proceso] = (h[b.proceso] || 0) + b.duracionMin / 60;
  });
  return h;
}

// Distribuye cada bloque (duración variable) proporcionalmente entre los tramos de 30 min del mapa de calor
function distribucionDesdeBloquesProf(bloques) {
  const d = distribucionVacia();
  bloques.forEach((b) => {
    if (b.esTurno) return;
    const inicio = b.inicioMin;
    const fin = b.inicioMin + b.duracionMin;
    BLOQUES.forEach((label, idx) => {
      const cellStart = HORA_INICIO_DIA * 60 + idx * 30;
      const cellEnd = cellStart + 30;
      const overlap = Math.min(fin, cellEnd) - Math.max(inicio, cellStart);
      if (overlap > 0) d[b.dia][label] += overlap / 60;
    });
  });
  return d;
}

// Cuenta cuántos profesionales distintos tienen un bloque programado en cada día/tramo de 30 min
function paralelosDesdeBloquesProf(bloques) {
  const sets = {};
  DIAS.forEach((dia) => {
    sets[dia] = {};
    BLOQUES.forEach((label) => { sets[dia][label] = new Set(); });
  });
  bloques.forEach((b) => {
    if (b.esTurno) return;
    const dia = b.dia;
    const inicio = b.inicioMin;
    const fin = b.inicioMin + b.duracionMin;
    BLOQUES.forEach((label, idx) => {
      const cellStart = HORA_INICIO_DIA * 60 + idx * 30;
      const cellEnd = cellStart + 30;
      const overlap = Math.min(fin, cellEnd) - Math.max(inicio, cellStart);
      if (overlap > 0) sets[dia][label].add(b.profesionalId);
    });
  });
  const counts = {};
  DIAS.forEach((dia) => {
    counts[dia] = {};
    BLOQUES.forEach((label) => { counts[dia][label] = sets[dia][label].size; });
  });
  return counts;
}

function makeAgenda(servicio, jefe, horas, mes, cnePct, atenciones, distribucionHoraria, profesionales, bloquesProf, pendienteConfirmar, vigenciaDesde, vigenciaHasta) {
  idCounter += 1;
  return {
    id: idCounter,
    servicio,
    jefe,
    mes,
    vigenciaDesde: vigenciaDesde || null,
    vigenciaHasta: vigenciaHasta || null,
    version: 1,
    estado: 'borrador',
    horas,
    cnePct: cnePct ?? 8,
    atenciones: atenciones ?? 0,
    distribucionHoraria: distribucionHoraria || distribucionVacia(),
    profesionales: profesionales || [],
    bloquesProf: bloquesProf || [],
    pendienteConfirmar: !!pendienteConfirmar,
    createdAt: nowStr(),
    lastUpdated: Date.now(),
    historial: [{ fecha: nowStr(), accion: 'Creada', usuario: jefe, comentario: 'Agenda creada en borrador.' }],
    resumenIA: null,
    motivoRechazo: null,
  };
}

// Última versión conocida de Cardiología: 3 médicos con bloques de duración real y prestaciones reales del catálogo
const CARDIO_PROFESIONALES = [
  { id: 'p1', nombre: 'Dr. Rojas', tipo: 'Médico(a) Cirujano(a)' },
  { id: 'p2', nombre: 'Dra. Fuentes', tipo: 'Médico(a) Cirujano(a)' },
  { id: 'p3', nombre: 'Dr. Soto', tipo: 'Médico(a) Cirujano(a)' },
];

function bloqueCardio(profesionalId, dia, horaInicio, duracionMin, proceso, actividad) {
  const item = CATALOGO_ACTIVIDADES.find((a) => a.proceso === proceso && a.actividad === actividad && a.especialidad === 'CARDIOLOGÍA ADULTO');
  const sugerido = rendimientoSugeridoMinsal('Médico(a) Cirujano(a)', 'CARDIOLOGÍA ADULTO', actividad);
  return {
    id: nuevoBloqueId(), profesionalId, dia, inicioMin: M(horaInicio), duracionMin,
    proceso, actividad,
    clinica: item ? item.clinica : true,
    tieneRendimiento: item ? item.tieneRendimiento : true,
    rendimiento: item && item.tieneRendimiento ? (sugerido ?? 2) : 0,
  };
}

const CARDIO_BLOQUES = [
  bloqueCardio('p1', 'Lunes', '08:00', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p1', 'Lunes', '08:30', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p1', 'Lunes', '09:00', 20, 'Ambulatorio', 'Consulta Control de especialidad Presencial'),
  bloqueCardio('p1', 'Lunes', '09:20', 20, 'Ambulatorio', 'Consulta Control de especialidad Presencial'),
  bloqueCardio('p1', 'Lunes', '09:40', 20, 'Ambulatorio', 'Consulta Control de especialidad Presencial'),
  bloqueCardio('p1', 'Lunes', '10:00', 45, 'Ambulatorio', 'Ecocardiograma con/sin Doppler'),
  bloqueCardio('p1', 'Miércoles', '08:00', 180, 'Quirúrgico', 'Pabellon Cirugía Mayor'),
  bloqueCardio('p1', 'Viernes', '09:00', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p1', 'Viernes', '09:30', 20, 'Ambulatorio', 'Consulta Control de especialidad Presencial'),
  bloqueCardio('p1', 'Viernes', '09:50', 20, 'Ambulatorio', 'Consulta Control de especialidad Presencial'),
  bloqueCardio('p2', 'Martes', '08:00', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p2', 'Martes', '08:30', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p2', 'Martes', '09:00', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p2', 'Martes', '10:00', 20, 'Ambulatorio', 'Telemedicina Control (Teleinterconsulta sincrónica)'),
  bloqueCardio('p2', 'Jueves', '08:00', 60, 'Quirúrgico', 'Pabellon Cirugía Menor'),
  bloqueCardio('p2', 'Jueves', '09:00', 60, 'Quirúrgico', 'Pabellon Cirugía Menor'),
  bloqueCardio('p2', 'Jueves', '10:30', 20, 'Ambulatorio', 'Consulta Control de especialidad Presencial'),
  bloqueCardio('p2', 'Jueves', '10:50', 20, 'Ambulatorio', 'Consulta Control de especialidad Presencial'),
  bloqueCardio('p2', 'Sábado', '08:00', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p2', 'Sábado', '08:30', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p3', 'Lunes', '08:00', 15, 'Hospitalizado', 'Atención en sala'),
  bloqueCardio('p3', 'Lunes', '08:15', 15, 'Hospitalizado', 'Atención en sala'),
  bloqueCardio('p3', 'Lunes', '08:30', 15, 'Hospitalizado', 'Atención en sala'),
  bloqueCardio('p3', 'Lunes', '09:00', 20, 'Hospitalizado', 'Interconsulta'),
  bloqueCardio('p3', 'Miércoles', '08:00', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p3', 'Miércoles', '08:30', 30, 'Ambulatorio', 'Consulta Nueva de especialidad Presencial'),
  bloqueCardio('p3', 'Miércoles', '09:00', 45, 'Ambulatorio', 'Ecocardiograma con/sin Doppler'),
  bloqueCardio('p3', 'Viernes', '08:00', 120, 'Quirúrgico', 'Pabellon Cirugía Mayor Ambulatoria'),
];

const SEED_AGENDAS = [
  makeAgenda(
    'Cardiología', 'Dr. Rojas',
    horasDesdeBloquesProf(CARDIO_BLOQUES),
    'Septiembre 2026', 9.5, 180,
    distribucionDesdeBloquesProf(CARDIO_BLOQUES),
    CARDIO_PROFESIONALES, CARDIO_BLOQUES
  ),
  makeAgenda(
    'Oftalmología', 'Dra. Molina',
    { Ambulatorio: 85, Hospitalizado: 8, Quirúrgico: 20, Urgencia: 5 },
    'Septiembre 2026', 17.2, 210,
    generarDistribucionEjemplo(3.4)
  ),
  makeAgenda(
    'Traumatología', 'Dr. Peña',
    { Ambulatorio: 73, Hospitalizado: 18, Quirúrgico: 18, Urgencia: 8 },
    'Septiembre 2026', 7.1, 150,
    generarDistribucionEjemplo(2.1)
  ),
];
SEED_AGENDAS[1].estado = 'enviada';
SEED_AGENDAS[1].historial.push({ fecha: nowStr(), accion: 'Enviada a Referente', usuario: 'Dra. Molina', comentario: 'Lista para revisión.' });

/* ---------------------------------------------------------
   Llamadas a la API de Claude (resumen IA y chat)
--------------------------------------------------------- */

async function callClaude(messages, system) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return 'La integración IA no está configurada. Define VITE_ANTHROPIC_API_KEY para habilitarla.';
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system,
        messages,
      }),
    });
    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    return text || 'No se obtuvo respuesta.';
  } catch (e) {
    return 'Ocurrió un error al conectar con el servicio de IA. Intenta nuevamente.';
  }
}

function buildResumenPrompt(agenda) {
  const porProceso = PROCESOS_CAT.map((p) => `${p}: ${(agenda.horas[p] || 0).toFixed(1)} hrs`).join(', ');
  const actividadesTop = horasPorActividad(agenda.bloquesProf).slice(0, 6).map((t) => `${t.actividad}: ${t.horas} hrs`).join(', ');
  const total = totalHorasAgenda(agenda.horas);
  const rendimiento = total > 0 ? (agenda.atenciones / total).toFixed(2) : '0.00';

  let picoDia = null, picoBloque = null, picoHoras = -1;
  DIAS.forEach((dia) => {
    BLOQUES.forEach((b) => {
      const v = agenda.distribucionHoraria[dia][b];
      if (v > picoHoras) { picoHoras = v; picoDia = dia; picoBloque = b; }
    });
  });

  return `Eres un asistente para un Departamento de Desarrollo Institucional de un hospital chileno. Genera un resumen ESTANDARIZADO y breve (máximo 7 líneas, en español, sin markdown) de la siguiente agenda ambulatoria, para que un Jefe de Servicio y un Referente de Programación lo lean en segundos. Incluye: distribución de horas por proceso (Ambulatorio, Hospitalizado, Quirúrgico, Urgencia), un comentario sobre las prestaciones más relevantes, el %CNE y si está sobre el umbral de 8% (referencial) o de alerta 15%, el rendimiento (atenciones por hora total), el día/bloque de mayor concentración horaria, y una observación breve sobre el balance de la agenda.

Servicio: ${agenda.servicio}
Mes: ${agenda.mes}
Horas por proceso: ${porProceso}
Prestaciones con más horas cargadas: ${actividadesTop || 'sin datos'}
Total horas: ${total.toFixed(1)}
%CNE reportado: ${agenda.cnePct}%
Atenciones realizadas: ${agenda.atenciones}
Rendimiento (atenciones/hora): ${rendimiento}
Bloque de mayor concentración horaria: ${picoDia} ${picoBloque} (${picoHoras} hrs)`;
}

/* ---------------------------------------------------------
   Componentes de UI
--------------------------------------------------------- */

function PromptDialog({ titulo, placeholder, valorInicial, onConfirmar, onCancelar }) {
  const [valor, setValor] = useState(valorInicial || '');
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[80] p-4" style={{ background: 'rgba(30,46,51,0.5)' }} onClick={onCancelar}>
      <div className="bg-white rounded-xl w-full max-w-xs p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-semibold text-slate-800 mb-3">{titulo}</div>
        <input
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && valor.trim()) onConfirmar(valor.trim());
            if (e.key === 'Escape') onCancelar();
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none"
        />
        <button
          onClick={() => { if (valor.trim()) onConfirmar(valor.trim()); }}
          style={{ background: '#4C7C74' }}
          className="w-full text-white text-sm font-medium py-2 rounded-lg mt-3"
        >
          Confirmar
        </button>
        <button onClick={onCancelar} className="w-full text-slate-500 text-sm py-2 rounded-lg mt-1.5">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ConfirmDialog({ mensaje, onConfirmar, onCancelar, destructivo }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[80] p-4" style={{ background: 'rgba(30,46,51,0.5)' }} onClick={onCancelar}>
      <div className="bg-white rounded-xl w-full max-w-xs p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm text-slate-700 mb-4">{mensaje}</div>
        <button
          onClick={onConfirmar}
          style={{ background: destructivo ? '#B6522F' : '#4C7C74' }}
          className="w-full text-white text-sm font-medium py-2 rounded-lg"
        >
          Confirmar
        </button>
        <button onClick={onCancelar} className="w-full text-slate-500 text-sm py-2 rounded-lg mt-1.5">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, loading, error }) {
  const [email, setEmail] = useState('admin@hospital.local');
  const [password, setPassword] = useState('demo123');

  const demoRoles = [
    { id: 'jefe_servicio', label: 'Jefe de Servicio' },
    { id: 'referente_programacion', label: 'Referente de Programación' },
    { id: 'admision', label: 'Admisión' },
    { id: 'subdirector', label: 'Subdirector Atención Ambulatoria' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F2ED] flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid md:grid-cols-[1.1fr_0.9fr] overflow-hidden rounded-3xl border border-slate-200 shadow-2xl bg-white">
        <div className="bg-[#1E2E33] p-8 md:p-10 text-white">
          <div className="text-xs tracking-[0.24em] uppercase text-[#9FB0B5]">HSJD La Serena</div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight">Seguimiento y Programación de Agendas Institucionales</h1>
          <p className="mt-4 text-sm text-[#CBD5D9] max-w-md">
            Frontend conectado a API real con autenticación, catálogo institucional y persistencia en base de datos.
          </p>
          <div className="mt-8 space-y-2">
            {demoRoles.map((item) => (
              <button
                key={item.id}
                onClick={() => onLogin({ mode: 'demo', role: item.id })}
                disabled={loading}
                className="block w-full rounded-xl border border-[#3E545B] bg-[#2A3E44] px-4 py-3 text-left text-sm hover:bg-[#31474E] disabled:opacity-50"
              >
                Entrar como {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-8 md:p-10">
          <div className="text-sm font-semibold text-slate-800">Acceso con credenciales</div>
          <div className="text-xs text-slate-500 mt-1">Puedes usar las cuentas demo seeded en la base local.</div>
          <div className="mt-5 space-y-3">
            <label className="block text-xs font-medium text-slate-600">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            {error && <div className="rounded-xl bg-[#FBEEE8] px-3 py-2 text-xs text-[#B6522F]">{error}</div>}
            <button
              onClick={() => onLogin({ mode: 'credentials', email, password })}
              disabled={loading}
              style={{ background: '#4C7C74' }}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfesionalDialog({ titulo, nombreInicial, tipoInicial, nivelFormacionInicial, tieneTurnoInicial, rutInicial, especialidadInicial, especialidadServicio, onConfirmar, onCancelar }) {
  const [nombre, setNombre] = useState(nombreInicial || '');
  const [tipo, setTipo] = useState(tipoInicial || TIPOS_PROFESIONAL[0]);
  // '' = usa la especialidad del servicio. Solo hace falta elegir otra en agendas que agrupan
  // varias especialidades (ej. CESAM: psiquiatría adulto + infanto-juvenil).
  const [especialidad, setEspecialidad] = useState(especialidadInicial || '');
  const [especialidadesTipo, setEspecialidadesTipo] = useState([]);
  useEffect(() => {
    let cancelado = false;
    fetchCatalogSpecialties(tipo)
      .then((lista) => { if (!cancelado) setEspecialidadesTipo((lista || []).filter((e) => e !== 'No Aplica')); })
      .catch(() => { if (!cancelado) setEspecialidadesTipo([]); });
    return () => { cancelado = true; };
  }, [tipo]);
  const [esBecado, setEsBecado] = useState(!!nivelFormacionInicial);
  const [nivelDetalle, setNivelDetalle] = useState((nivelFormacionInicial || '').replace(/^Becado\s*/i, ''));
  const [tieneTurno, setTieneTurno] = useState(!!tieneTurnoInicial);
  const [rut, setRut] = useState(rutInicial || null);
  const [vinculado, setVinculado] = useState(rutInicial ? { rut: rutInicial, nombreFuncionario: nombreInicial, cargo: '', unidad: '' } : null);
  // Empieza SIEMPRE en modo búsqueda (incluso al editar un profesional ya cargado a mano sin
  // rut) — antes quedaba en modo manual por defecto cada vez que no había rutInicial, lo que
  // dejaba la caja de búsqueda visible pero con el useEffect de búsqueda desactivado, así que
  // escribir ahí nunca mostraba resultados. El usuario recién pasa a manual si hace clic en
  // "no está en la dotación".
  const [modoManual, setModoManual] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (modoManual || busqueda.trim().length < 2) { setResultados([]); return; }
    let cancelado = false;
    setBuscando(true);
    const timeoutId = setTimeout(async () => {
      try {
        const data = await fetchHrPersonas(busqueda.trim());
        if (!cancelado) setResultados(data.items || []);
      } catch (_err) {
        if (!cancelado) setResultados([]);
      } finally {
        if (!cancelado) setBuscando(false);
      }
    }, 300);
    return () => { cancelado = true; clearTimeout(timeoutId); };
  }, [busqueda, modoManual]);

  function elegirPersona(p) {
    setVinculado(p);
    setRut(p.rut);
    setNombre(p.nombreFuncionario);
    setBusqueda('');
    setResultados([]);
  }

  function quitarVinculo() {
    setVinculado(null);
    setRut(null);
    setModoManual(true);
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[80] p-4" style={{ background: 'rgba(30,46,51,0.5)' }} onClick={onCancelar}>
      <div className="bg-white rounded-xl w-full max-w-xs p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-semibold text-slate-800 mb-3">{titulo}</div>

        {vinculado ? (
          <div className="mb-2.5 rounded-lg border border-[#4C7C74]/30 bg-[#EBF5F2] px-2.5 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">{vinculado.nombreFuncionario}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  RUT {vinculado.rut}{vinculado.cargo ? ` · ${vinculado.cargo}` : ''}
                </div>
                {vinculado.unidad && <div className="text-[10px] text-slate-400">{vinculado.unidad}</div>}
              </div>
              <button onClick={quitarVinculo} className="text-[10px] text-[#4C7C74] hover:underline shrink-0">Quitar</button>
            </div>
            <div className="text-[9px] font-semibold text-[#4C7C74] mt-1 uppercase tracking-wide">Vinculado a dotación (RRHH)</div>
          </div>
        ) : (
          <div className="mb-2.5">
            <label className="text-xs text-slate-600 font-medium block mb-1">Buscar en dotación (RRHH)</label>
            <div className="relative">
              <input
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Escribe un nombre..."
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none"
              />
              {buscando && <Loader2 size={13} className="animate-spin absolute right-2.5 top-2.5 text-slate-400" />}
              {resultados.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {resultados.map((p) => (
                    <button
                      key={p.rut}
                      onClick={() => elegirPersona(p)}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                    >
                      <div className="text-xs text-slate-700">{p.nombreFuncionario}</div>
                      <div className="text-[10px] text-slate-400">RUT {p.rut}{p.cargo ? ` · ${p.cargo}` : ''}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setModoManual(true)} className="text-[10px] text-slate-400 hover:text-slate-600 mt-1">
              No está en la dotación / escribir nombre manualmente
            </button>
          </div>
        )}

        {modoManual && !vinculado && (
          <label className="text-xs text-slate-600 font-medium block mb-2.5">
            Nombre
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Dr./Dra. ..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none"
            />
          </label>
        )}

        <label className="text-xs text-slate-600 font-medium block mb-2.5">
          Tipo de profesional
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm bg-white">
            {TIPOS_PROFESIONAL.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        {(especialidadesTipo.length > 0 || especialidad) && (
          <label className="text-xs text-slate-600 font-medium block mb-2.5">
            Especialidad
            <select value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm bg-white">
              <option value="">La del servicio{especialidadServicio && especialidadServicio !== 'No Aplica' ? ` (${especialidadServicio})` : ''}</option>
              {[...new Set([...(especialidad ? [especialidad] : []), ...especialidadesTipo])]
                .filter((e) => e !== especialidadServicio)
                .map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
        )}
        <label className="flex items-center gap-2 text-xs text-slate-600 font-medium py-1 cursor-pointer">
          <input type="checkbox" checked={esBecado} onChange={(e) => setEsBecado(e.target.checked)} />
          Es becado / en formación
        </label>
        {esBecado && (
          <label className="text-xs text-slate-600 font-medium block mt-1.5">
            Nivel <span className="font-normal text-slate-400">(opcional, ej. R1, R2)</span>
            <input
              value={nivelDetalle}
              onChange={(e) => setNivelDetalle(e.target.value)}
              placeholder="Ej: R1"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none"
            />
          </label>
        )}
        <label className="flex items-center gap-2 text-xs text-slate-600 font-medium py-1 mt-1.5 cursor-pointer">
          <input type="checkbox" checked={tieneTurno} onChange={(e) => setTieneTurno(e.target.checked)} />
          Tiene turno (Art. 15)
        </label>
        <button
          onClick={() => {
            if (!nombre.trim()) return;
            const nivelFormacion = esBecado ? `Becado${nivelDetalle.trim() ? ` ${nivelDetalle.trim()}` : ''}` : '';
            onConfirmar(nombre.trim(), tipo, nivelFormacion, tieneTurno, rut, especialidad || null);
          }}
          style={{ background: '#4C7C74' }}
          className="w-full text-white text-sm font-medium py-2 rounded-lg mt-3"
        >
          Confirmar
        </button>
        <button onClick={onCancelar} className="w-full text-slate-500 text-sm py-2 rounded-lg mt-1.5">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Badge({ estado }) {
  const cfg = ESTADOS[estado];
  return (
    <span
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + '55' }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

// Agenda provisional copiada de la programación de otro periodo (ej. 2027 = copia de la 2026).
function periodoCopia(agenda) {
  const m = String(agenda?.copiaDe || '').match(/(20\d\d)$/);
  return agenda?.copiaDe ? (m ? m[1] : 'anterior') : null;
}
function BadgeCopia({ agenda }) {
  const p = periodoCopia(agenda);
  if (!p) return null;
  return (
    <span
      title={`Copia provisional de la programación ${p} (${agenda.copiaDe}) mientras llega la versión ${agenda.periodo}`}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border border-amber-300 bg-amber-50 text-amber-700 whitespace-nowrap"
    >
      Programación {p}
    </span>
  );
}

function AgendaCard({ agenda, onOpen }) {
  const total = totalHorasAgenda(agenda.horas);
  const ultimoEvento = agenda.historial?.[agenda.historial.length - 1];
  return (
    <button
      onClick={() => onOpen(agenda)}
      className="w-full text-left bg-white rounded-xl border border-slate-200 p-3.5 hover:border-slate-400 hover:shadow-sm transition-all relative"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-[15px] text-slate-800 leading-tight">{agenda.servicio}</div>
          <div className="text-xs text-slate-500 mt-0.5">{agenda.jefe} · {agenda.mes}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[11px] font-mono text-slate-400">#{agenda.id}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${agenda.version > 1 ? 'bg-[#F1EDFB] text-[#7A5CC7]' : 'bg-slate-100 text-slate-400'}`}>
            v{agenda.version}
          </span>
          <BadgeCopia agenda={agenda} />
          {!esVigente(agenda) && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">No vigente</span>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500">
        <span className="shrink-0">{total.toFixed(1)} hrs totales</span>
        <span className="text-slate-400 truncate">{ultimoEvento ? `Act. ${ultimoEvento.fecha}` : 'Sin actividad registrada'}</span>
      </div>
    </button>
  );
}

// Input con buffer local: solo notifica el cambio (onCommit) al perder foco o presionar Enter,
// en vez de en cada tecla. Evita que un guardado en curso (llamada a la API) pise lo que el usuario está escribiendo.
function EditableText({ value, onCommit, className, type = 'text', ...props }) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => { setLocal(value ?? ''); }, [value]);
  return (
    <input
      type={type}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== (value ?? '')) onCommit(local); }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      className={className}
      {...props}
    />
  );
}

// Catálogo de prestaciones por tipo de profesional|servicio|especialidad, compartido entre
// profesionales para no volver a pedirlo al servidor (cada consulta tarda ~1 s).
const CACHE_CATALOGO = new Map();

function TablaAgendaProfesional({ profesional, especialidad, servicio, bloques, soloLectura, onAgregarFila, onEditarFila, onEliminarFila, onLimpiar, onEliminarProfesional }) {
  const [filtroDia, setFiltroDia] = useState('todos');
  const [filtroProceso, setFiltroProceso] = useState('todos');
  const [filtroPrestacion, setFiltroPrestacion] = useState('todos');
  const [filtroBox, setFiltroBox] = useState('todos');
  const [soloTopes, setSoloTopes] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const diasPresentes = DIAS.filter((d) => bloques.some((b) => b.dia === d));
  const procesosPresentes = Array.from(new Set(bloques.map((b) => b.proceso).filter(Boolean))).sort();
  const prestacionesPresentes = Array.from(new Set(bloques.map((b) => b.actividad).filter(Boolean))).sort();
  const boxesPresentes = Array.from(new Set(bloques.map((b) => b.box).filter(Boolean))).sort();
  const topes = detectarTopes(bloques);
  const filtroActivo = filtroDia !== 'todos' || filtroProceso !== 'todos' || filtroPrestacion !== 'todos' || filtroBox !== 'todos' || busqueda.trim() !== '' || soloTopes;

  const filas = bloques
    .slice()
    .sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || a.inicioMin - b.inicioMin)
    .filter((b) => filtroDia === 'todos' || b.dia === filtroDia)
    .filter((b) => filtroProceso === 'todos' || b.proceso === filtroProceso)
    .filter((b) => filtroPrestacion === 'todos' || b.actividad === filtroPrestacion)
    .filter((b) => filtroBox === 'todos' || b.box === filtroBox)
    .filter((b) => !soloTopes || topes.has(b.id))
    .filter((b) => {
      const q = busqueda.trim().toLowerCase();
      if (!q) return true;
      return (b.observaciones || '').toLowerCase().includes(q);
    });
  const filasJornada = filas.filter((b) => !b.esTurno);
  const totalHrs = filasJornada.reduce((s, b) => s + b.duracionMin / 60, 0);
  const totalCupos = filasJornada.reduce((s, b) => s + (b.tieneRendimiento ? Math.round((b.rendimiento || 0) * (b.duracionMin / 60)) : 0), 0);
  const totalHrsTurno = filas.filter((b) => b.esTurno).reduce((s, b) => s + b.duracionMin / 60, 0);
  // Horas por día (jornada y turno por separado) — franja superior con TODOS los bloques del
  // profesional, y subtotal al final de cada día en la tabla con las filas visibles.
  const horasPorDia = (lista) => {
    const m = {};
    lista.forEach((b) => {
      m[b.dia] ||= { jornada: 0, turno: 0 };
      m[b.dia][b.esTurno ? 'turno' : 'jornada'] += b.duracionMin / 60;
    });
    return m;
  };
  const horasDiaTodas = horasPorDia(bloques);
  const horasDiaVisibles = horasPorDia(filas);
  const fmtH = (h) => `${(Math.round(h * 10) / 10).toLocaleString('es-CL')} h`;
  const diasSemana = [...DIAS, ...Object.keys(horasDiaTodas).filter((d) => !DIAS.includes(d))];
  const [opciones, setOpciones] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const wrapperRef = useRef(null);
  const bodyRef = useRef(null);
  const [insertPos, setInsertPos] = useState(null); // { idx, y }

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      const clave = `${profesional.tipo}|${servicio}|${especialidad}`;
      // Catálogo ya cargado antes para este tipo/servicio/especialidad: se muestra al instante.
      if (CACHE_CATALOGO.has(clave)) {
        setOpciones(CACHE_CATALOGO.get(clave));
        return;
      }
      setCatalogLoading(true);
      try {
        // Reintenta: si la base o el servidor fallan un momento (red del hospital, reinicio),
        // no queremos dejar la lista de prestaciones vacía hasta recargar la página.
        let response = null;
        for (let intento = 0; intento < 4 && !cancelled; intento++) {
          try {
            response = await fetchCatalogActivities({
              profession: profesional.tipo,
              serviceName: servicio,
              specialty: especialidad,
            });
            break;
          } catch (error) {
            if (intento === 3) throw error;
            await new Promise((r) => setTimeout(r, 1500 * (intento + 1)));
          }
        }
        if (!cancelled && response) {
          const items = response.items.map((item) => ({
            proceso: item.process,
            actividad: item.activity,
            clinica: item.isClinical,
            tieneRendimiento: item.hasPerformance,
          }));
          if (items.length) CACHE_CATALOGO.set(clave, items);
          setOpciones(items);
        }
      } catch (_error) {
        if (!cancelled) {
          setOpciones(actividadesPara(profesional.tipo, especialidad));
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    }
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [profesional.tipo, especialidad, servicio]);

  function handleMouseMove(e) {
    if (soloLectura) return;
    const wrapper = wrapperRef.current;
    const body = bodyRef.current;
    if (!wrapper || !body) return;
    const filasEl = Array.from(body.querySelectorAll('tr[data-fila]'));
    const contRect = wrapper.getBoundingClientRect();
    if (filasEl.length === 0) {
      setInsertPos({ idx: 0, y: body.getBoundingClientRect().top - contRect.top });
      return;
    }
    let idx = filasEl.length;
    let y = filasEl[filasEl.length - 1].getBoundingClientRect().bottom - contRect.top;
    for (let i = 0; i < filasEl.length; i++) {
      const r = filasEl[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        idx = i;
        y = r.top - contRect.top;
        break;
      }
    }
    setInsertPos({ idx, y });
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
            {profesional.nombre} <span className="text-xs font-normal text-slate-400">· {profesional.tipo || 'Sin tipo'}</span>
            {soloLectura ? (
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Solo lectura</span>
            ) : (
              <span
                className="text-slate-400 hover:text-[#4C7C74] cursor-help"
                title={`Última programación cargada para este profesional. Edita cualquier celda directamente, como en una planilla.\n· Mueve el mouse sobre la tabla para insertar una fila en esa posición.\n· Usa el círculo rojo de cada fila para eliminarla.\n· La lista de prestaciones es la real para ${profesional.tipo || 'este tipo de profesional'}.`}
              >
                <Info size={14} />
              </span>
            )}
            {catalogLoading && <span className="text-[10px] font-normal text-slate-400">Cargando catálogo…</span>}
          </div>
        </div>
        {!soloLectura && (
          <div className="flex gap-3 shrink-0">
            <button onClick={onLimpiar} className="text-xs text-slate-500 hover:text-slate-700 underline">
              Comenzar en blanco
            </button>
            <button onClick={onEliminarProfesional} className="text-xs text-[#B6522F] hover:underline">
              Eliminar profesional
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        <select value={filtroDia} onChange={(e) => setFiltroDia(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2 py-1.5 bg-white">
          <option value="todos">Todos los días</option>
          {diasPresentes.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filtroProceso} onChange={(e) => setFiltroProceso(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2 py-1.5 bg-white">
          <option value="todos">Todos los procesos</option>
          {procesosPresentes.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroPrestacion} onChange={(e) => setFiltroPrestacion(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2 py-1.5 bg-white max-w-[220px]">
          <option value="todos">Todas las prestaciones</option>
          {prestacionesPresentes.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroBox} onChange={(e) => setFiltroBox(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2 py-1.5 bg-white">
          <option value="todos">Todos los box</option>
          {boxesPresentes.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar en observaciones..."
          className="text-xs rounded-lg border border-slate-300 px-2 py-1.5 bg-white w-52"
        />
        {filtroActivo && (
          <button
            onClick={() => { setFiltroDia('todos'); setFiltroProceso('todos'); setFiltroPrestacion('todos'); setFiltroBox('todos'); setBusqueda(''); setSoloTopes(false); }}
            className="text-xs text-[#4C7C74] hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {bloques.length > 0 && (
        <div className="mb-2.5 flex flex-wrap items-stretch gap-1.5">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide self-center mr-1">Horas por día</div>
          {diasSemana.map((d) => {
            const h = horasDiaTodas[d] || { jornada: 0, turno: 0 };
            const vacio = h.jornada === 0 && h.turno === 0;
            return (
              <button
                key={d}
                onClick={() => setFiltroDia((actual) => (actual === d ? 'todos' : d))}
                title={vacio ? `${d}: sin bloques` : `${d}: ${fmtH(h.jornada)} de jornada${h.turno ? ` + ${fmtH(h.turno)} de turno` : ''} — clic para filtrar este día`}
                className={`rounded-lg border px-2 py-1 text-left min-w-[62px] ${filtroDia === d ? 'border-[#4C7C74] bg-[#EBF5F2]' : vacio ? 'border-slate-100 bg-slate-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <div className={`text-[10px] ${vacio ? 'text-slate-300' : 'text-slate-500'}`}>{d.slice(0, 3)}</div>
                <div className={`text-xs font-semibold ${vacio ? 'text-slate-300' : 'text-slate-800'}`}>{vacio ? '—' : fmtH(h.jornada)}</div>
                {h.turno > 0 && <div className="text-[9px] font-semibold text-[#B6522F]">+ {fmtH(h.turno)} turno</div>}
              </button>
            );
          })}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 min-w-[70px]">
            <div className="text-[10px] text-slate-500">Semana</div>
            <div className="text-xs font-semibold text-slate-800">{fmtH(Object.values(horasDiaTodas).reduce((s, h) => s + h.jornada, 0))}</div>
            {Object.values(horasDiaTodas).some((h) => h.turno > 0) && (
              <div className="text-[9px] font-semibold text-[#B6522F]">+ {fmtH(Object.values(horasDiaTodas).reduce((s, h) => s + h.turno, 0))} turno</div>
            )}
          </div>
        </div>
      )}

      {topes.size > 0 && (
        <div className="mb-2.5 rounded-lg border border-[#F2C4C4] bg-[#FDECEC] px-3 py-2 text-[11px] text-[#9B2C2C] flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={13} />
            <b>{topes.size} bloques se superponen</b> en el horario de este profesional (marcados en rojo). Revisa las horas de inicio y término.
          </span>
          <button onClick={() => setSoloTopes((v) => !v)} className="font-medium underline">
            {soloTopes ? 'Ver todos los bloques' : 'Ver solo los topes'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div ref={wrapperRef} className="relative" onMouseMove={handleMouseMove} onMouseLeave={() => setInsertPos(null)}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 whitespace-nowrap">
              <tr>
                <th className="text-left px-2.5 py-2 font-medium">Día</th>
                <th className="text-left px-2.5 py-2 font-medium">Hora inicio</th>
                <th className="text-left px-2.5 py-2 font-medium">Hora término</th>
                <th className="text-left px-2.5 py-2 font-medium min-w-[200px]">Prestación</th>
                <th className="text-left px-2.5 py-2 font-medium hidden xl:table-cell">Proceso</th>
                <th className="text-left px-2.5 py-2 font-medium hidden lg:table-cell">Box</th>
                <th className="text-right px-2.5 py-2 font-medium">Cupos</th>
                <th className="text-right px-2.5 py-2 font-medium hidden lg:table-cell" title="Minutos por cupo">Min/cupo</th>
                <th className="text-left px-2.5 py-2 font-medium">Observaciones</th>
                <th className="text-center px-2.5 py-2 font-medium">Turno</th>
                {!soloLectura && <th className="w-10 text-center font-medium">Borrar</th>}
              </tr>
            </thead>
            <tbody ref={bodyRef}>
              {filas.length === 0 && (
                <tr><td colSpan={soloLectura ? 10 : 11} className="px-2.5 py-6 text-center text-slate-400 italic">
                  {filtroActivo
                    ? 'Ningún bloque coincide con los filtros aplicados.'
                    : soloLectura ? 'Sin actividades cargadas.' : 'Sin actividades cargadas. Mueve el mouse sobre esta área y haz clic para agregar la primera.'}
                </td></tr>
              )}
              {filas.map((b, idx) => {
                const ultimaDelDia = idx === filas.length - 1 || filas[idx + 1].dia !== b.dia;
                const hd = horasDiaVisibles[b.dia] || { jornada: 0, turno: 0 };
                const filaSubtotal = ultimaDelDia && (
                  <tr className="bg-slate-50/80 border-t border-slate-200">
                    <td colSpan={soloLectura ? 10 : 11} className="px-2.5 py-1 text-[11px] text-slate-500">
                      {filtroActivo ? 'Subtotal' : 'Total'} {b.dia}: <b className="text-slate-700">{fmtH(hd.jornada)}</b> de jornada
                      {hd.turno > 0 && <span className="text-[#B6522F]"> · {fmtH(hd.turno)} de turno</span>}
                    </td>
                  </tr>
                );
                const cupos = b.tieneRendimiento ? Math.round((b.rendimiento || 0) * (b.duracionMin / 60)) : null;
                const choques = topes.get(b.id);
                const estiloFila = choques
                  ? { background: '#FDECEC', boxShadow: 'inset 3px 0 0 #DC2626' }
                  : b.esTurno ? { background: '#FDF6EC' } : undefined;
                const avisoTope = choques && (
                  <span title={`Se superpone con: ${describirTopes(choques)}`} className="text-[#DC2626] shrink-0 cursor-help"><AlertTriangle size={12} /></span>
                );
                const duracionPorCupo = cupos ? Math.round((b.duracionMin / cupos) * 10) / 10 : null;
                if (soloLectura) {
                  return (
                    <React.Fragment key={b.id}>
                    <tr data-fila className="border-t border-slate-100" style={estiloFila}>
                      <td className="px-2.5 py-1.5 text-slate-600"><span className="inline-flex items-center gap-1">{avisoTope}{b.dia}</span></td>
                      <td className="px-2.5 py-1.5 text-slate-600">{hhmmDesdeMin(b.inicioMin)}</td>
                      <td className="px-2.5 py-1.5 text-slate-600">{horaFinTexto(b.inicioMin, b.duracionMin)}</td>
                      <td className="px-2.5 py-1.5 min-w-[200px]" style={{ color: b.proceso ? COLOR_PROCESO[b.proceso] : '#94a3b8' }}>{b.actividad || '—'}</td>
                      <td className="px-2.5 py-1.5 text-slate-600 hidden xl:table-cell">{b.proceso || '—'}</td>
                      <td className="px-2.5 py-1.5 text-slate-600 hidden lg:table-cell">{b.box || '—'}</td>
                      <td className="px-2.5 py-1.5 text-right text-slate-600 font-medium">{cupos === null ? 'N/A' : cupos}</td>
                      <td className="px-2.5 py-1.5 text-right text-slate-600 hidden lg:table-cell">{duracionPorCupo === null ? '—' : `${duracionPorCupo} min`}</td>
                      <td className="px-2.5 py-1.5 text-slate-600">{b.observaciones || '—'}</td>
                      <td className="px-2.5 py-1.5 text-center">{b.esTurno && <span className="text-[10px] font-semibold text-[#B6522F] bg-[#FBEEE8] px-1.5 py-0.5 rounded-full">Turno</span>}</td>
                    </tr>
                    {filaSubtotal}
                    </React.Fragment>
                  );
                }
                return (
                  <React.Fragment key={b.id}>
                  <tr data-fila className="border-t border-slate-100 hover:bg-slate-50/60" style={estiloFila}>
                    <td className="px-1 py-1">
                      <div className="flex items-center gap-0.5">
                        {avisoTope}
                        <select value={b.dia} onChange={(e) => onEditarFila(b.id, { dia: e.target.value })} className="text-xs bg-transparent focus:outline-none focus:bg-white rounded px-1 py-1 w-full min-w-[84px]">
                          {(b.esTurno || b.dia === 'Domingo' ? DIAS_TURNO : DIAS).map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="px-1 py-1">
                      <EditableText
                        type="time"
                        value={hhmmDesdeMin(b.inicioMin)}
                        onCommit={(v) => { if (v) onEditarFila(b.id, { inicioMin: M(v) }); }}
                        className="text-xs bg-transparent focus:outline-none focus:bg-white rounded px-1 py-1 w-[76px]"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex items-center gap-0.5">
                        <EditableText
                          type="time"
                          value={hhmmDesdeMin((b.inicioMin + b.duracionMin) % 1440)}
                          onCommit={(v) => {
                            if (!v) return;
                            let dur = M(v) - b.inicioMin;
                            // Un turno puede terminar al día siguiente (ej. 08:00 → 08:00 = 24 h).
                            if (b.esTurno && dur <= 0) dur += 1440;
                            onEditarFila(b.id, { duracionMin: Math.max(5, dur) });
                          }}
                          className="text-xs bg-transparent focus:outline-none focus:bg-white rounded px-1 py-1 w-[76px]"
                        />
                        {b.inicioMin + b.duracionMin >= 1440 && b.inicioMin + b.duracionMin !== 1440 && (
                          <span className="text-[9px] font-semibold text-[#B6522F]" title="Termina al día siguiente">+1d</span>
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-1">
                      <select
                        value={b.proceso && b.actividad ? `${b.proceso}|||${b.actividad}` : ''}
                        onChange={async (e) => {
                          if (!e.target.value) return;
                          const [proceso, actividad] = e.target.value.split('|||');
                          const item = opciones.find((o) => o.proceso === proceso && o.actividad === actividad);
                          let sugerido = null;
                          try {
                            const ref = await fetchReferencePerformance({ activity: actividad, serviceName: servicio, specialty: especialidad, process: proceso });
                            sugerido = ref.suggestion;
                          } catch (_error) {
                            sugerido = rendimientoSugeridoMinsal(profesional.tipo, especialidad, actividad);
                          }
                          onEditarFila(b.id, {
                            proceso, actividad,
                            clinica: item ? item.clinica : true,
                            tieneRendimiento: item ? item.tieneRendimiento : true,
                            rendimiento: item && item.tieneRendimiento ? (sugerido ?? (b.tieneRendimiento ? b.rendimiento : 2)) : 0,
                          });
                        }}
                        title={b.actividad || ''}
                        className="text-xs bg-transparent focus:outline-none focus:bg-white rounded px-1 py-1 w-full min-w-[190px]"
                        style={{ color: b.proceso ? COLOR_PROCESO[b.proceso] : '#94a3b8' }}
                      >
                        {!b.proceso && <option value="">{b.esTurno ? 'Turno (sin prestación)' : '— Selecciona prestación —'}</option>}
                        {/* La prestación actual siempre se muestra, aunque el catálogo aún no cargue o no la incluya. */}
                        {b.proceso && b.actividad && !opciones.some((o) => o.proceso === b.proceso && o.actividad === b.actividad) && (
                          <option value={`${b.proceso}|||${b.actividad}`}>{b.actividad}</option>
                        )}
                        {[
                          ...PROCESOS_CAT.filter((p) => opciones.some((o) => o.proceso === p)),
                          ...Array.from(new Set(opciones.map((o) => o.proceso))).filter((p) => !PROCESOS_CAT.includes(p)),
                        ].map((proceso) => (
                          <optgroup key={proceso} label={proceso}>
                            {opciones.filter((o) => o.proceso === proceso).map((o) => (
                              <option key={o.actividad} value={`${o.proceso}|||${o.actividad}`}>{o.actividad}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1 hidden xl:table-cell">
                      {(() => {
                        const procesosValidos = Array.from(new Set(opciones.filter((o) => o.actividad === b.actividad).map((o) => o.proceso)));
                        if (!b.actividad || procesosValidos.length === 0) {
                          return <div className="text-xs text-slate-300 px-1 py-1">—</div>;
                        }
                        return (
                          <select
                            value={b.proceso || ''}
                            onChange={(e) => {
                              const nuevoProceso = e.target.value;
                              const item = opciones.find((o) => o.proceso === nuevoProceso && o.actividad === b.actividad);
                              onEditarFila(b.id, {
                                proceso: nuevoProceso,
                                clinica: item ? item.clinica : b.clinica,
                                tieneRendimiento: item ? item.tieneRendimiento : false,
                                rendimiento: item && item.tieneRendimiento ? b.rendimiento : 0,
                              });
                            }}
                            className="text-xs bg-transparent focus:outline-none focus:bg-white rounded px-1 py-1 w-full"
                            style={{ color: b.proceso ? COLOR_PROCESO[b.proceso] : '#94a3b8' }}
                          >
                            {procesosValidos.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        );
                      })()}
                    </td>
                    <td className="px-1 py-1 hidden lg:table-cell">
                      <EditableText
                        value={b.box || ''}
                        onCommit={(v) => onEditarFila(b.id, { box: v })}
                        placeholder="—"
                        className="text-xs bg-transparent focus:outline-none focus:bg-white rounded px-1 py-1 w-16"
                      />
                    </td>
                    <td className="px-1 py-1">
                      {b.tieneRendimiento ? (
                        <EditableText
                          type="number" min={0} step={1}
                          value={cupos ?? 0}
                          onCommit={(v) => {
                            const nuevoCupos = Math.max(0, Math.round(Number(v) || 0));
                            const nuevoRendimiento = b.duracionMin > 0 ? Math.round((nuevoCupos * 60 / b.duracionMin) * 100) / 100 : 0;
                            onEditarFila(b.id, { rendimiento: nuevoRendimiento });
                          }}
                          className="text-xs text-right bg-transparent focus:outline-none focus:bg-white rounded px-1 py-1 w-16"
                        />
                      ) : (
                        <div className="text-xs text-slate-300 text-right pr-1">N/A</div>
                      )}
                    </td>
                    <td className="px-2.5 py-1 text-right text-slate-600 font-medium hidden lg:table-cell">{duracionPorCupo === null ? '—' : `${duracionPorCupo} min`}</td>
                    <td className="px-1 py-1">
                      <EditableText
                        value={b.observaciones || ''}
                        onCommit={(v) => onEditarFila(b.id, { observaciones: v })}
                        placeholder="—"
                        className="text-xs bg-transparent focus:outline-none focus:bg-white rounded px-1 py-1 w-full min-w-[120px]"
                      />
                    </td>
                    <td className="text-center px-1 py-1">
                      <input
                        type="checkbox"
                        checked={Boolean(b.esTurno)}
                        onChange={(e) => onEditarFila(b.id, e.target.checked
                          // Al marcar turno se asume un turno de 24 h desde la hora de inicio (editable después).
                          // y sin prestación: el turno no es una actividad de jornada.
                          ? { esTurno: true, duracionMin: duracionTurnoServicio(servicio), proceso: null, actividad: null, tieneRendimiento: false, rendimiento: 0 }
                          : { esTurno: false })}
                        title={`Es un bloque de turno (Art. 15) — no cuenta como horas de jornada. Al marcarlo se asume ${duracionTurnoServicio(servicio) / 60} h desde la hora de inicio.`}
                      />
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => onEliminarFila(b.id)}
                        title="Eliminar esta fila"
                        style={{ background: '#FBEEE8', color: '#B6522F' }}
                        className="rounded-full w-6 h-6 inline-flex items-center justify-center"
                      >
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                  {filaSubtotal}
                  </React.Fragment>
                );
              })}
            </tbody>
            {filas.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={6} className="px-2.5 py-2 text-right text-slate-500 font-medium">Totales</td>
                  <td className="px-2.5 py-2 text-right font-semibold text-slate-700">{totalCupos}</td>
                  <td></td>
                  <td></td>
                  {!soloLectura && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>

          {!soloLectura && insertPos && (
            <>
              <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ top: insertPos.y, borderTop: '2px dashed #4C7C74' }} />
              <button
                onClick={() => onAgregarFila(filas[insertPos.idx - 1] || null, filas[insertPos.idx] || null)}
                style={{ top: Math.max(insertPos.y - 8, 2), background: '#4C7C74' }}
                className="absolute left-2 z-20 flex items-center gap-1 text-[9px] text-white px-2 py-0.5 rounded-full shadow whitespace-nowrap"
              >
                <Plus size={9} /> Insertar fila aquí
              </button>
            </>
          )}
        </div>
      </div>
      {!soloLectura && (
        <button
          onClick={() => onAgregarFila(filas[filas.length - 1] || null, null)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#4C7C74] border border-dashed border-[#4C7C74]/50 rounded-lg px-3 py-1.5 hover:bg-[#EBF5F2]"
        >
          <Plus size={13} /> Agregar fila al final
        </button>
      )}
      <div className="text-[11px] text-slate-400 mt-2">
        {filtroActivo ? 'Total horas (filtrado)' : 'Total horas de jornada'}: {totalHrs.toFixed(1)} hrs
        {totalHrsTurno > 0 && <> · Turno: {totalHrsTurno.toFixed(1)} hrs</>}
      </div>
    </div>
  );
}

// Parámetros de proyección de producción anual
const SEMANAS_POR_ANIO = 52;
const AUSENTISMO_PCT = 15;

function ResumenProfesionalPanel({ bloques }) {
  const horas = horasDesdeBloquesProf(bloques);
  const totalHrs = totalHorasAgenda(horas);
  const porProceso = PROCESOS_CAT.map((p) => ({ proceso: p, horas: horas[p] || 0 }));
  const dist = distribucionDesdeBloquesProf(bloques);
  const cuposSemanales = bloques.filter((b) => !b.esTurno).reduce((s, b) => s + (b.rendimiento || 0) * (b.duracionMin / 60), 0);
  const produccionAnualBruta = cuposSemanales * SEMANAS_POR_ANIO;
  const produccionAnualNeta = produccionAnualBruta * (1 - AUSENTISMO_PCT / 100);

  return (
    <div className="w-full 2xl:w-72 shrink-0 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-1 items-start content-start">

      <div>
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Distribución por proceso</div>
        <div className="bg-white rounded-xl border border-slate-200 p-2.5" style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porProceso} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="proceso" tick={{ fontSize: 8 }} interval={0} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="horas" fill="#4C7C74" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Mapa de calor semanal</div>
        <div className="bg-white rounded-xl border border-slate-200 p-2.5 overflow-y-auto" style={{ maxHeight: 260 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `26px repeat(${DIAS.length}, 1fr)`, gap: 1 }}>
            <div />
            {DIAS.map((dia) => (
              <div key={dia} className="text-[7px] text-slate-500 font-medium text-center">{dia.slice(0, 2)}</div>
            ))}
            {BLOQUES.map((b) => (
              <React.Fragment key={b}>
                <div className="text-[6px] text-slate-400 text-right pr-0.5">{b.slice(3, 5) === '00' ? b.slice(0, 2) : ''}</div>
                {DIAS.map((dia) => {
                  const h = dist[dia][b];
                  const color = heatColorOcupacion(h);
                  return <div key={dia} title={`${dia} ${b} — ${h.toFixed(2)} hrs`} style={{ background: color.bg, height: 8, borderRadius: 1 }} />;
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Proyección de producción anual</div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Cupos semanales (rendimiento × hrs)</span>
            <span className="font-medium text-slate-700">{cuposSemanales.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">× {SEMANAS_POR_ANIO} semanas/año</span>
            <span className="font-medium text-slate-700">{produccionAnualBruta.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-xs pt-1.5 border-t border-slate-100">
            <span className="text-slate-500">− {AUSENTISMO_PCT}% ausentismo</span>
            <span className="font-semibold text-slate-800">{produccionAnualNeta.toFixed(0)} at/año</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 mt-1.5">Estimación referencial: cupos semanales × {SEMANAS_POR_ANIO} semanas, descontando un {AUSENTISMO_PCT}% de ausentismo esperado. Ajustable según la realidad de cada servicio.</div>
      </div>
    </div>
  );
}

function cuposBloque(b) {
  return b.tieneRendimiento ? Math.round((b.rendimiento || 0) * (b.duracionMin / 60)) : 0;
}

// Clasificación por texto de la prestación: contiene "Nueva" o "Control" (consultas presenciales, telemedicina, etc.)
// El % Consulta Nueva solo considera prestaciones presenciales — se excluye cualquier
// telemedicina/teleconsulta/contacto telefónico (todas contienen "tele" en el nombre).
function esPrestacionPresencial(actividad) {
  return !/tele/i.test(actividad || '');
}
function esConsultaNueva(actividad) {
  return /nueva/i.test(actividad || '') && esPrestacionPresencial(actividad);
}
function esConsultaControl(actividad) {
  return /control/i.test(actividad || '') && esPrestacionPresencial(actividad);
}

// Horas, cupos y rendimiento (cupos/hora) logrado por cada prestación que sí lleva rendimiento
function rendimientoPorPrestacion(bloques) {
  const map = {};
  bloques.forEach((b) => {
    if (!b.tieneRendimiento) return;
    const key = `${b.proceso}|||${b.actividad}`;
    if (!map[key]) map[key] = { proceso: b.proceso, actividad: b.actividad, horas: 0, cupos: 0 };
    map[key].horas += b.duracionMin / 60;
    map[key].cupos += cuposBloque(b);
  });
  return Object.values(map)
    .map((item) => ({
      ...item,
      horas: Math.round(item.horas * 10) / 10,
      rendimiento: item.horas > 0 ? Math.round((item.cupos / item.horas) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.horas - a.horas);
}

function ResumenAgendaTab({ profesionales: profesionalesTodos, bloques: bloquesTodosRaw, proyeccionTurno, servicio }) {
  const [seleccion, setSeleccion] = useState([]); // [{ proceso, actividad }] — se pueden combinar varias prestaciones
  const [seleccionProfMapa, setSeleccionProfMapa] = useState([]); // claves de profesionales para armar el mapa de calor
  const [filtroBecados, setFiltroBecados] = useState('todos'); // 'todos' | 'sin' | 'solo'
  const [filtroTiposProfesional, setFiltroTiposProfesional] = useState([]); // [] = todos los tipos
  const [filtroProfesional, setFiltroProfesional] = useState('todos');
  const [verHorasEfectivas, setVerHorasEfectivas] = useState(false);
  const [capacidadPabellon, setCapacidadPabellon] = useState(null); // { cargado, grid } | null

  // Disponibilidad real de infraestructura (por ahora solo pabellón) para este servicio, para
  // cruzarla con lo programado en el heatmap en vez de usar siempre la capacidad genérica de
  // referencia. Si el usuario no tiene acceso (ej. servicio de otro jefe) o no hay planilla
  // cargada, simplemente no se ofrece — no es un error visible.
  useEffect(() => {
    let cancelado = false;
    if (!servicio) { setCapacidadPabellon(null); return; }
    fetchPabellonCapacidad(servicio)
      .then((data) => { if (!cancelado) setCapacidadPabellon(data); })
      .catch(() => { if (!cancelado) setCapacidadPabellon(null); });
    return () => { cancelado = true; };
  }, [servicio]);
  const hayProyeccionTurno = Array.isArray(proyeccionTurno) && proyeccionTurno.length > 0;
  const proyeccionPorNombre = new Map(
    (proyeccionTurno || []).map((p) => [p.professionalName.trim().toLowerCase(), p])
  );

  // Mapa profesional(id público)+día+horario -> minutos que en promedio se pierden por semana
  // ese bloque específico al cruzarse con turno (Art. 15) real este mes. Se usa para, cuando el
  // usuario activa "horas efectivas", ajustar la duración de cada bloque ANTES de que corra
  // cualquier cálculo derivado (horas, cupos, heatmap, gráficos) — así el toggle afecta todo el
  // resumen de forma consistente en vez de ser un número aparte solo para una tabla.
  const perdidaPorBloqueMap = new Map();
  if (hayProyeccionTurno) {
    profesionalesTodos.forEach((p) => {
      const cruce = proyeccionPorNombre.get((p.nombre || '').trim().toLowerCase());
      (cruce?.perdidaPorBloque || []).forEach((pb) => {
        perdidaPorBloqueMap.set(`${p.id}|||${pb.dia}|||${pb.inicioMin}`, pb.minutosPerdidosPromedioSemanal);
      });
    });
  }
  const activarHorasEfectivas = verHorasEfectivas && hayProyeccionTurno;
  const bloquesTodos = activarHorasEfectivas
    ? bloquesTodosRaw.map((b) => {
        if (b.esTurno) return b;
        const minutosPerdidos = perdidaPorBloqueMap.get(`${b.profesionalId}|||${b.dia}|||${b.inicioMin}`);
        if (!minutosPerdidos) return b;
        return { ...b, duracionMin: Math.max(0, b.duracionMin - minutosPerdidos) };
      })
    : bloquesTodosRaw;

  const hayBecados = profesionalesTodos.some((p) => p.nivelFormacion);
  const tiposProfesional = Array.from(new Set(profesionalesTodos.map((p) => p.tipo || 'Sin tipo'))).sort();
  const profesionales = profesionalesTodos.filter((p) => {
    if (filtroBecados !== 'todos' && (filtroBecados === 'solo' ? !p.nivelFormacion : p.nivelFormacion)) return false;
    if (filtroTiposProfesional.length > 0 && !filtroTiposProfesional.includes(p.tipo || 'Sin tipo')) return false;
    if (filtroProfesional !== 'todos' && p.id !== filtroProfesional) return false;
    return true;
  });
  const idsFiltrados = new Set(profesionales.map((p) => p.id));
  const sinFiltrosActivos = filtroBecados === 'todos' && filtroTiposProfesional.length === 0 && filtroProfesional === 'todos';
  const bloques = sinFiltrosActivos
    ? bloquesTodos
    : bloquesTodos.filter((b) => idsFiltrados.has(b.profesionalId));
  const horas = horasDesdeBloquesProf(bloques);
  const totalHrs = totalHorasAgenda(horas);
  const porProceso = PROCESOS_CAT.map((p) => ({ proceso: p, horas: horas[p] || 0 }));
  const porTrazadora = horasPorActividadYProceso(bloques);
  const bloquesPorPrestacion = seleccion.length > 0
    ? bloques.filter((b) => seleccion.some((s) => s.clave === claveActividad(b.actividad)))
    : bloques;
  const horasProfMapa = horasPorClaveProfesional(bloquesPorPrestacion, (b) => b.profesionalId);
  const opcionesProfMapa = profesionales
    .filter((p) => horasProfMapa.has(p.id) || seleccionProfMapa.includes(p.id))
    .map((p) => ({ key: p.id, nombre: p.nombre, detalle: p.tipo }));
  const bloquesDistribucion = seleccionProfMapa.length > 0
    ? bloquesPorPrestacion.filter((b) => seleccionProfMapa.includes(b.profesionalId))
    : bloquesPorPrestacion;
  const distribucionAgregada = distribucionDesdeBloquesProf(bloquesDistribucion);
  const paralelosPorBloque = paralelosDesdeBloquesProf(bloquesDistribucion);
  // Cuando lo que se está mirando en el heatmap es específicamente pabellón, se usa la capacidad
  // real (planilla de infraestructura) en vez de la genérica — mezclarla con otras prestaciones
  // no tendría sentido porque la capacidad de pabellón no aplica a consultas, box, etc.
  const esPabellonSeleccionado = seleccion.length > 0 && seleccion.every((s) => /pabellon/i.test(s.actividad || ''));
  const usarCapacidadRealPabellon = esPabellonSeleccionado && capacidadPabellon?.cargado;
  const totalCupos = bloques.reduce((s, b) => s + cuposBloque(b), 0);

  const cuposNuevas = bloques.filter((b) => esConsultaNueva(b.actividad)).reduce((s, b) => s + cuposBloque(b), 0);
  const cuposControles = bloques.filter((b) => esConsultaControl(b.actividad)).reduce((s, b) => s + cuposBloque(b), 0);
  const pctConsultaNueva = cuposNuevas + cuposControles > 0 ? Math.round((cuposNuevas / (cuposNuevas + cuposControles)) * 100) : null;

  const rendimientoPrestaciones = rendimientoPorPrestacion(bloques);

  const hayTurno = bloques.some((b) => b.esTurno);
  const porProfesional = profesionales
    .map((p) => {
      const bp = bloques.filter((b) => b.profesionalId === p.id);
      const bpJornada = bp.filter((b) => !b.esTurno);
      return {
        ...p,
        horas: bpJornada.reduce((s, b) => s + b.duracionMin / 60, 0),
        cupos: bpJornada.reduce((s, b) => s + cuposBloque(b), 0),
        horasTurno: bp.filter((b) => b.esTurno).reduce((s, b) => s + b.duracionMin / 60, 0),
        bloques: bp.length,
      };
    })
    .sort((a, b) => b.horas - a.horas);

  // Cuánto se pierde por semana (promedio del mes en curso) solo dentro del conjunto ya
  // filtrado, para que el aviso arriba del resumen sea coherente con los filtros de profesional
  // que el usuario tenga activos.
  const totalHorasPerdidasSemanales = activarHorasEfectivas
    ? bloques.reduce((s, b) => {
        if (b.esTurno) return s;
        const minutosPerdidos = perdidaPorBloqueMap.get(`${b.profesionalId}|||${b.dia}|||${b.inicioMin}`) || 0;
        return s + minutosPerdidos / 60;
      }, 0)
    : 0;

  return (
    <div className="space-y-5">
      {hayProyeccionTurno && (
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-500">Todo este resumen (horas, cupos, gráficos y heatmap):</span>
            <button
              onClick={() => setVerHorasEfectivas((v) => !v)}
              className={`text-xs px-2.5 py-1 rounded-full border ${verHorasEfectivas ? 'bg-[#B6522F] text-white border-[#B6522F]' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'}`}
            >
              {verHorasEfectivas ? 'Viendo horas efectivas (cruzadas con turno)' : 'Ver horas efectivas (cruzadas con turno)'}
            </button>
          </div>
          {activarHorasEfectivas && (
            <div className="text-[11px] text-slate-500 bg-[#FBEEE8] border border-[#F2D9CC] rounded-lg px-3 py-2 mt-2">
              Jornada (Art. 19) cruzada contra el turno (Art. 15) real del mes en curso: cada bloque que se superpone con un turno queda con su duración reducida por el promedio semanal de horas perdidas, y esa reducción se propaga a horas, cupos, % consulta nueva, producción anual y el heatmap de abajo. Total perdido este mes en el conjunto filtrado: <strong>{totalHorasPerdidasSemanales.toFixed(1)} hrs/semana</strong>.
            </div>
          )}
        </div>
      )}
      {(hayBecados || tiposProfesional.length > 1 || profesionalesTodos.length > 1) && (
        <div className="flex items-center gap-2 flex-wrap">
          {hayBecados && (
            <>
              <span className="text-[11px] text-slate-500">Profesionales:</span>
              {[
                { value: 'todos', label: 'Todos' },
                { value: 'sin', label: 'Sin becados' },
                { value: 'solo', label: 'Solo becados' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFiltroBecados(opt.value)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${filtroBecados === opt.value ? 'bg-[#4C7C74] text-white border-[#4C7C74]' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'}`}
                >
                  {opt.label}
                </button>
              ))}
            </>
          )}
          {tiposProfesional.length > 1 && (
            <FiltroMultiServicio
              servicios={tiposProfesional}
              seleccionados={filtroTiposProfesional}
              onCambiar={setFiltroTiposProfesional}
              textoTodos="Todos los tipos de profesional"
              plural="tipos"
            />
          )}
          {profesionalesTodos.length > 1 && (
            <select
              value={filtroProfesional}
              onChange={(e) => setFiltroProfesional(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
            >
              <option value="todos">Todos los profesionales</option>
              {profesionalesTodos.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Profesionales', value: profesionales.length },
          { label: activarHorasEfectivas ? 'Horas efectivas' : 'Horas programadas', value: totalHrs.toFixed(1) },
          { label: activarHorasEfectivas ? 'Cupos efectivos' : 'Cupos semanales', value: totalCupos },
          { label: 'Bloques', value: bloques.length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3">
            <div className="text-[11px] text-slate-500">{s.label}</div>
            <div className="text-xl font-semibold text-slate-800 mt-0.5">{s.value}</div>
          </div>
        ))}
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-[11px] text-slate-500">% Consulta Nueva</div>
          <div className="text-xl font-semibold text-slate-800 mt-0.5">{pctConsultaNueva === null ? '—' : `${pctConsultaNueva}%`}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{cuposNuevas} nuevas / {cuposControles} controles</div>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Horas por proceso</div>
        <div className="bg-white rounded-xl border border-slate-200 p-3" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porProceso} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="proceso" tick={{ fontSize: 9 }} interval={0} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => [`${value.toFixed(1)} hrs`, 'Horas']} />
              <Bar dataKey="horas" fill="#4C7C74" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="horas"
                  position="top"
                  style={{ fontSize: 9, fill: '#475569' }}
                  formatter={(value) => (totalHrs > 0 ? `${Math.round((value / totalHrs) * 100)}%` : '')}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <GraficoHorasPorPrestacion datos={porTrazadora} seleccion={seleccion} setSeleccion={setSeleccion} />

      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Distribución horaria{seleccion.length > 0 ? ` — ${seleccion.length === 1 ? `${seleccion[0].actividad} (${seleccion[0].proceso})` : `${seleccion.length} prestaciones seleccionadas`}` : ' de la agenda'}
          </div>
          <div className="flex items-center gap-2">
            {esPabellonSeleccionado && (
              usarCapacidadRealPabellon ? (
                <span className="text-[10px] font-semibold text-[#2F6C5D] bg-[#EBF5F2] px-2 py-0.5 rounded-full">Capacidad real de pabellón</span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Sin planilla de pabellón cargada — capacidad estimada</span>
              )
            )}
          </div>
        </div>
        <SelectorProfesionalesMapa opciones={opcionesProfMapa} horasPorKey={horasProfMapa} seleccion={seleccionProfMapa} setSeleccion={setSeleccionProfMapa} />
        <div className={usarCapacidadRealPabellon ? 'flex flex-wrap gap-6 items-start' : ''}>
          <div>
            {usarCapacidadRealPabellon && <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Programado</div>}
            <div className="bg-white rounded-xl border border-slate-200 p-3 overflow-x-auto">
              <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${DIAS.length}, 34px)`, gap: 3, width: 'max-content' }}>
                <div />
                {DIAS.map((dia) => (
                  <div key={dia} className="text-[10px] text-slate-600 font-medium text-center">{dia.slice(0, 3)}</div>
                ))}
                {BLOQUES.map((b) => (
                  <React.Fragment key={b}>
                    <div className="text-[8px] text-slate-400 flex items-center justify-end pr-1">{b.slice(3, 5) === '00' ? b.slice(0, 2) : ''}</div>
                    {DIAS.map((dia) => {
                      const horasProgramadas = distribucionAgregada[dia][b];
                      const pabellonesAsignados = usarCapacidadRealPabellon ? (capacidadPabellon.grid[dia]?.[b] ?? 0) : null;
                      // Se convierte a horas (un pabellón asignado aporta 0.5 hrs de capacidad en un
                      // bloque de 30 min) para poder compararlo en la misma unidad que horasProgramadas
                      // y reusar exactamente la misma escala de color que la capacidad genérica.
                      const capacidad = usarCapacidadRealPabellon ? pabellonesAsignados * 0.5 : INFRAESTRUCTURA_CAPACIDAD[dia][b];
                      const pct = capacidad > 0 ? (horasProgramadas / capacidad) * 100 : (horasProgramadas > 0 ? 999 : 0);
                      const color = heatColor(pct);
                      const paralelos = paralelosPorBloque[dia][b];
                      const detalleCapacidad = usarCapacidadRealPabellon
                        ? `${pabellonesAsignados} pabellón${pabellonesAsignados === 1 ? '' : 'es'} asignado${pabellonesAsignados === 1 ? '' : 's'}`
                        : `${capacidad} hrs (estimado)`;
                      return (
                        <div
                          key={dia}
                          title={`${dia} ${b} — ${horasProgramadas.toFixed(1)} hrs programadas / ${detalleCapacidad} (${capacidad > 0 ? pct.toFixed(0) + '%' : 'sin capacidad'}) · ${paralelos} profesional${paralelos === 1 ? '' : 'es'} en paralelo`}
                          style={{ background: color.bg, height: 16, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {paralelos > 0 && (
                            <span style={{ color: color.text, fontSize: 9, fontWeight: 600 }}>{paralelos}</span>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 px-1 max-w-xs">
                <span className="text-[10px] text-slate-400">0%</span>
                <div className="flex-1 h-2.5 rounded-full" style={{ background: 'linear-gradient(to right, hsl(165,62%,88%), hsl(82,62%,64%), hsl(41,62%,52%), hsl(0,62%,40%))' }} />
                <span className="text-[10px] text-slate-400">≥130%</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">Color = % de uso respecto a la capacidad de infraestructura (boxes/pabellones) disponible por día y bloque de 30 min. El número en cada celda es la cantidad de profesionales en paralelo. Pasa el mouse sobre una celda para ver el detalle.</div>
          </div>
          {usarCapacidadRealPabellon && <CapacidadPabellonHeatmap grid={capacidadPabellon.grid} />}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Detalle por profesional{activarHorasEfectivas ? ' (horas efectivas)' : ''}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Profesional</th>
                <th className="text-left px-3 py-2 font-medium">Tipo</th>
                <th className="text-left px-3 py-2 font-medium">Nivel</th>
                <th className="text-right px-3 py-2 font-medium">Horas{activarHorasEfectivas ? ' efectivas' : ''}</th>
                {hayTurno && <th className="text-right px-3 py-2 font-medium">Horas turno</th>}
                <th className="text-right px-3 py-2 font-medium">Cupos</th>
                <th className="text-right px-3 py-2 font-medium">Bloques</th>
              </tr>
            </thead>
            <tbody>
              {porProfesional.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-slate-700">{p.nombre}</td>
                  <td className="px-3 py-1.5 text-slate-500">{p.tipo || 'Sin tipo'}</td>
                  <td className="px-3 py-1.5">
                    {p.nivelFormacion && (
                      <span className="inline-block text-[10px] font-semibold text-[#7A5CC7] bg-[#F1EDFB] px-1.5 py-0.5 rounded-full">{p.nivelFormacion}</span>
                    )}
                    {p.esSoloTurno ? (
                      <span className="inline-block text-[10px] font-semibold text-[#B6522F] bg-[#FBEEE8] px-1.5 py-0.5 rounded-full ml-1">Solo turno</span>
                    ) : p.tieneTurno && (
                      <span className="inline-block text-[10px] font-semibold text-[#B6522F] bg-[#FBEEE8] px-1.5 py-0.5 rounded-full ml-1">Turno</span>
                    )}
                  </td>
                  <td className={`px-3 py-1.5 text-right ${activarHorasEfectivas ? 'font-medium text-[#B6522F]' : 'text-slate-600'}`}>{p.horas.toFixed(1)}</td>
                  {hayTurno && <td className="px-3 py-1.5 text-right text-slate-600">{p.horasTurno > 0 ? p.horasTurno.toFixed(1) : '—'}</td>}
                  <td className="px-3 py-1.5 text-right text-slate-600">{p.cupos}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">{p.bloques}</td>
                </tr>
              ))}
              {porProfesional.length === 0 && (
                <tr><td colSpan={hayTurno ? 7 : 6} className="px-3 py-6 text-center text-slate-400 italic">Sin profesionales cargados en esta agenda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Rendimiento por prestación</div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Prestación</th>
                <th className="text-left px-3 py-2 font-medium">Proceso</th>
                <th className="text-right px-3 py-2 font-medium">Horas</th>
                <th className="text-right px-3 py-2 font-medium">Cupos</th>
                <th className="text-right px-3 py-2 font-medium">Rendimiento (at/hr)</th>
              </tr>
            </thead>
            <tbody>
              {rendimientoPrestaciones.map((r) => (
                <tr key={`${r.proceso}|||${r.actividad}`} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-slate-700">{r.actividad}</td>
                  <td className="px-3 py-1.5" style={{ color: COLOR_PROCESO[r.proceso] }}>{r.proceso}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">{r.horas.toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">{r.cupos}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600 font-medium">{r.rendimiento.toFixed(2)}</td>
                </tr>
              ))}
              {rendimientoPrestaciones.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400 italic">Sin prestaciones con rendimiento cargadas en esta agenda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-[11px] text-slate-400 mt-1.5">Solo incluye prestaciones que llevan cupos/rendimiento. Rendimiento = cupos totales ÷ horas totales de esa prestación.</div>
      </div>
    </div>
  );
}

// Muestra la rotación de turno (Art. 15) de un servicio: se calcula sola a partir del orden
// de personas + fecha ancla de cada rotación, no depende de que se haya cargado una tabla para
// el mes que se está mirando. No se mezcla con las horas de jornada (Art. 19) — son dos datos
// separados para que el jefe de servicio los cruce manualmente, como ya hace hoy.
const PUESTO_COLORES = ['#4C7C74', '#7A5CC7', '#B6522F', '#3B6FA0', '#0F6E56'];

function primerDiaMes(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function fechaISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
// Semana empieza en lunes: convierte getDay() (0=domingo) a 0=lunes..6=domingo.
function diaSemanaLunesPrimero(date) {
  return (date.getDay() + 6) % 7;
}

// Crea o edita una ShiftRotation: unidad, puesto, ciclo de días y la secuencia ordenada de
// profesionales del ciclo. Un profesional nuevo (que no está en la agenda todavía) se crea al
// guardar como "solo turno" (sin bloques de jornada), reusando el endpoint normal de crear
// profesional — por eso requiere que la agenda esté editable (borrador/rechazada) para dar de
// alta gente nueva; con profesionales ya existentes no hay esa restricción.
// Presets de duración del turno — cubren los dos formatos reales vistos (24h continuo, o 2x12h
// diurno/nocturno). "startMinutes"/"durationMinutes" ya existían en el esquema desde el
// principio; esto es lo que faltaba para poder elegirlos desde la UI en vez de asumir 24h fijo.
const DURACION_TURNO_PRESETS = [
  { id: '24h', label: '24 horas (08:00 → 08:00 día siguiente)', startMinutes: 480, durationMinutes: 1440 },
  { id: '12h-dia', label: '12 horas diurno (08:00 → 20:00)', startMinutes: 480, durationMinutes: 720 },
  { id: '12h-noche', label: '12 horas nocturno (20:00 → 08:00 día siguiente)', startMinutes: 1200, durationMinutes: 720 },
];
function presetDesdeRotacion(rotacion) {
  const match = DURACION_TURNO_PRESETS.find((p) => p.startMinutes === rotacion?.startMinutes && p.durationMinutes === rotacion?.durationMinutes);
  return match?.id || '24h';
}

function RotacionDialog({ rotacion, servicioId, agendaId, profesionales, onCancelar, onGuardado }) {
  const [unidad, setUnidad] = useState(rotacion?.unidad || '');
  const [puesto, setPuesto] = useState(rotacion?.puesto || '');
  const [cycleDays, setCycleDays] = useState(rotacion?.cycleDays || 6);
  const [anchorDate, setAnchorDate] = useState(rotacion?.anchorDate || '');
  const [duracionTurno, setDuracionTurno] = useState(() => presetDesdeRotacion(rotacion));
  const [afectaJornada, setAfectaJornada] = useState(rotacion?.affectsJornada ?? true);
  const [members, setMembers] = useState(() => {
    const base = rotacion?.members || [];
    return Array.from({ length: rotacion?.cycleDays || 6 }, (_, i) => {
      const m = base.find((x) => x.position === i);
      return { professionalId: m?.professionalId || '', professionalName: m?.professionalId ? '' : (m?.professionalName || ''), esNuevo: !m?.professionalId && !!m?.professionalName };
    });
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  function cambiarCycleDays(valor) {
    const n = Math.max(1, Math.min(31, Number(valor) || 1));
    setCycleDays(n);
    setMembers((prev) => {
      const next = prev.slice(0, n);
      while (next.length < n) next.push({ professionalId: '', professionalName: '', esNuevo: false });
      return next;
    });
  }

  function actualizarPosicion(i, cambios) {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...cambios } : m)));
  }

  async function guardar() {
    setError('');
    if (!unidad.trim() || !puesto.trim() || !anchorDate) {
      setError('Unidad, puesto y fecha ancla son obligatorios.');
      return;
    }
    if (members.some((m) => !m.professionalId && !m.professionalName.trim())) {
      setError('Todas las posiciones del ciclo necesitan un profesional.');
      return;
    }
    setGuardando(true);
    try {
      const resueltos = [];
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        if (m.professionalId) {
          const existente = profesionales.find((p) => p.id === m.professionalId);
          resueltos.push({ position: i, professionalId: m.professionalId, professionalName: existente?.nombre || '' });
        } else {
          const creado = await createProfessional(agendaId, {
            id: nuevoProfesionalId(),
            nombre: m.professionalName.trim(),
            tipo: 'Médico(a) Cirujano(a)',
            tieneTurno: true,
            esSoloTurno: true,
          });
          resueltos.push({ position: i, professionalId: creado.id, professionalName: creado.nombre });
        }
      }
      const preset = DURACION_TURNO_PRESETS.find((p) => p.id === duracionTurno) || DURACION_TURNO_PRESETS[0];
      const payload = {
        unidad: unidad.trim(),
        puesto: puesto.trim(),
        cycleDays,
        anchorDate,
        startMinutes: preset.startMinutes,
        durationMinutes: preset.durationMinutes,
        affectsJornada: afectaJornada,
        members: resueltos,
      };
      if (rotacion) {
        await updateShiftRotation(servicioId, rotacion.id, payload);
      } else {
        await createShiftRotation(servicioId, payload);
      }
      onGuardado();
    } catch (e) {
      setError(e?.message || 'No se pudo guardar la rotación. Si agregaste un profesional nuevo, revisa que la agenda esté en borrador.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[80] p-4" style={{ background: 'rgba(30,46,51,0.5)' }} onClick={onCancelar}>
      <div className="bg-white rounded-xl w-full max-w-md p-4 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-semibold text-slate-800 mb-3">{rotacion ? 'Editar rotación' : 'Nueva rotación'}</div>
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <label className="text-xs text-slate-600 font-medium block">
            Unidad
            <input value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="Ej: Unidad Coronaria" className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm" />
          </label>
          <label className="text-xs text-slate-600 font-medium block">
            Puesto
            <input value={puesto} onChange={(e) => setPuesto(e.target.value)} placeholder="Ej: Puesto A" className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm" />
          </label>
          <label className="text-xs text-slate-600 font-medium block">
            Ciclo (días)
            <input type="number" min={1} max={31} value={cycleDays} onChange={(e) => cambiarCycleDays(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm" />
          </label>
          <label className="text-xs text-slate-600 font-medium block">
            Fecha ancla (posición 0)
            <input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm" />
          </label>
          <label className="text-xs text-slate-600 font-medium block col-span-2">
            Duración del turno
            <select value={duracionTurno} onChange={(e) => setDuracionTurno(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm bg-white">
              {DURACION_TURNO_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600 font-medium col-span-2">
            <input type="checkbox" checked={afectaJornada} onChange={(e) => setAfectaJornada(e.target.checked)} className="rounded" />
            Este turno resta horas de jornada (Art. 19) al cruzarse — desmárcalo para roles como un "llamado" de respaldo que no debe descontar horas efectivas
          </label>
        </div>
        <div className="text-xs text-slate-600 font-medium mb-1.5">Orden del ciclo</div>
        <div className="space-y-1.5">
          {members.map((m, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 w-4 text-right">{i}</span>
              {!m.esNuevo ? (
                <select
                  value={m.professionalId}
                  onChange={(e) => {
                    if (e.target.value === '__nuevo__') {
                      actualizarPosicion(i, { professionalId: '', professionalName: '', esNuevo: true });
                    } else {
                      actualizarPosicion(i, { professionalId: e.target.value });
                    }
                  }}
                  className="flex-1 text-xs rounded-lg border border-slate-300 px-2 py-1.5 bg-white"
                >
                  <option value="">— Selecciona —</option>
                  {profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  <option value="__nuevo__">+ Nuevo profesional (solo turno)</option>
                </select>
              ) : (
                <>
                  <input
                    autoFocus
                    value={m.professionalName}
                    onChange={(e) => actualizarPosicion(i, { professionalName: e.target.value })}
                    placeholder="Nombre completo"
                    className="flex-1 text-xs rounded-lg border border-slate-300 px-2 py-1.5"
                  />
                  <button onClick={() => actualizarPosicion(i, { esNuevo: false, professionalName: '' })} className="text-[10px] text-slate-400 hover:text-slate-600 px-1">
                    cancelar
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        {error && <div className="text-xs text-[#B6522F] mt-2">{error}</div>}
        <button
          onClick={guardar}
          disabled={guardando}
          style={{ background: '#4C7C74' }}
          className="w-full text-white text-sm font-medium py-2 rounded-lg mt-3 disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={onCancelar} className="w-full text-slate-500 text-sm py-2 rounded-lg mt-1.5">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// Sustituciones puntuales de una rotación: reemplazan, solo para una fecha exacta, a quien
// tocaría por cálculo del ciclo.
function SustitucionesPanel({ rotacion, servicioId, profesionales, onCambio }) {
  const [fecha, setFecha] = useState('');
  const [profesionalId, setProfesionalId] = useState('');
  const [nota, setNota] = useState('');
  const [dividido, setDividido] = useState(false);
  const [profesionalNocheId, setProfesionalNocheId] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function agregar() {
    if (!fecha || !profesionalId) return;
    if (dividido && !profesionalNocheId) return;
    const prof = profesionales.find((p) => p.id === profesionalId);
    const profNoche = dividido ? profesionales.find((p) => p.id === profesionalNocheId) : null;
    setGuardando(true);
    try {
      await createShiftOverride(servicioId, rotacion.id, {
        date: fecha,
        professionalId,
        professionalName: prof?.nombre || '',
        note: nota.trim() || null,
        splitProfessionalId: profNoche?.id || null,
        splitProfessionalName: profNoche?.nombre || null,
      });
      setFecha('');
      setProfesionalId('');
      setNota('');
      setDividido(false);
      setProfesionalNocheId('');
      await onCambio();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mt-2.5 pt-2.5 border-t border-slate-100">
      <div className="space-y-1">
        {rotacion.overrides.map((o) => (
          <div key={o.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2.5 py-1.5">
            <span className="text-slate-600">
              {formatoFechaCorta(o.date)} — {o.professionalName}{o.splitProfessionalName ? ` (día) / ${o.splitProfessionalName} (noche)` : ''}{o.note ? ` — ${o.note}` : ''}
            </span>
            <button
              onClick={async () => { await deleteShiftOverride(servicioId, rotacion.id, o.id); await onCambio(); }}
              className="text-[#B6522F] hover:underline"
            >
              Quitar
            </button>
          </div>
        ))}
        {rotacion.overrides.length === 0 && <div className="text-[11px] text-slate-400 italic">Sin sustituciones.</div>}
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2 py-1.5" />
        <select value={profesionalId} onChange={(e) => setProfesionalId(e.target.value)} className="flex-1 text-xs rounded-lg border border-slate-300 px-2 py-1.5 bg-white min-w-[120px]">
          <option value="">{dividido ? '— Cubre de día —' : '— Profesional —'}</option>
          {profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (opcional)" className="text-xs rounded-lg border border-slate-300 px-2 py-1.5 w-28" />
        <button onClick={agregar} disabled={guardando || !fecha || !profesionalId || (dividido && !profesionalNocheId)} className="text-xs text-white px-2.5 py-1.5 rounded-lg disabled:opacity-40" style={{ background: '#4C7C74' }}>
          Agregar
        </button>
      </div>
      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1.5 cursor-pointer">
        <input type="checkbox" checked={dividido} onChange={(e) => setDividido(e.target.checked)} />
        Cobertura dividida día/noche
      </label>
      {dividido && (
        <select value={profesionalNocheId} onChange={(e) => setProfesionalNocheId(e.target.value)} className="mt-1 text-xs rounded-lg border border-slate-300 px-2 py-1.5 bg-white w-full">
          <option value="">— Cubre de noche —</option>
          {profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      )}
    </div>
  );
}

// Editar un día puntual directamente desde el calendario: crea o reemplaza una sustitución
// (ShiftRotationOverride) para esa fecha, o la quita para volver a lo que calcula el ciclo. Es
// la misma API que SustitucionesPanel, solo que entrando por el día en vez de por el formulario
// aparte — así el jefe va cubriendo puesto por puesto según quién esté disponible ese día.
function EditarTurnoDiaDialog({ edicion, servicioId, profesionales, onCancelar, onGuardado }) {
  const { fecha, fechaISO: fechaStr, unidad, puesto, rotacion, entry } = edicion;
  const overrideActual = rotacion.overrides.find((o) => o.date === fechaStr);
  const [profesionalId, setProfesionalId] = useState(entry?.professionalId || '');
  const [nota, setNota] = useState(overrideActual?.note || '');
  const [dividido, setDividido] = useState(!!overrideActual?.splitProfessionalId || !!overrideActual?.splitProfessionalName);
  const [profesionalNocheId, setProfesionalNocheId] = useState(overrideActual?.splitProfessionalId || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function guardar(vacante) {
    setError('');
    setGuardando(true);
    try {
      const prof = vacante ? null : profesionales.find((p) => p.id === profesionalId);
      if (!vacante && !prof) {
        setError('Selecciona un profesional o marca el puesto como vacante.');
        setGuardando(false);
        return;
      }
      const profNoche = dividido ? profesionales.find((p) => p.id === profesionalNocheId) : null;
      if (dividido && !vacante && !profNoche) {
        setError('Selecciona quién cubre la noche, o desactiva la cobertura dividida.');
        setGuardando(false);
        return;
      }
      await createShiftOverride(servicioId, rotacion.id, {
        date: fechaStr,
        professionalId: prof?.id || null,
        professionalName: vacante ? 'Vacante' : prof.nombre,
        note: nota.trim() || null,
        splitProfessionalId: profNoche?.id || null,
        splitProfessionalName: profNoche?.nombre || null,
      });
      await onGuardado();
    } catch (e) {
      setError(e?.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  async function quitarSustitucion() {
    if (!overrideActual) return;
    setGuardando(true);
    try {
      await deleteShiftOverride(servicioId, rotacion.id, overrideActual.id);
      await onGuardado();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[80] p-4" style={{ background: 'rgba(30,46,51,0.5)' }} onClick={onCancelar}>
      <div className="bg-white rounded-xl w-full max-w-sm p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-semibold text-slate-800">{unidad} — {puesto}</div>
        <div className="text-xs text-slate-500 mb-3 capitalize">{fecha.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1.5 mb-3">
          {entry?.professionalName ? (
            <>Corresponde ahora{entry.tramoSplit ? ` (${entry.tramoSplit})` : ''}: <strong>{entry.professionalName}</strong>{entry.esSustitucion ? ' (sustitución ya cargada)' : ' (por cálculo del ciclo)'}</>
          ) : 'Puesto sin asignar todavía.'}
        </div>
        <label className="text-xs text-slate-600 font-medium block mb-2.5">
          {dividido ? 'Profesional que cubre de día (08:00-20:00)' : 'Profesional que cubre este día'}
          <select value={profesionalId} onChange={(e) => setProfesionalId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm bg-white">
            <option value="">— Selecciona —</option>
            {profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-600 font-medium py-1 cursor-pointer">
          <input type="checkbox" checked={dividido} onChange={(e) => setDividido(e.target.checked)} />
          Cobertura dividida día/noche (ej. feriado legal cubierto por 2 personas)
        </label>
        {dividido && (
          <label className="text-xs text-slate-600 font-medium block mb-2.5 mt-1.5">
            Profesional que cubre de noche (20:00-08:00)
            <select value={profesionalNocheId} onChange={(e) => setProfesionalNocheId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm bg-white">
              <option value="">— Selecciona —</option>
              {profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
        )}
        <label className="text-xs text-slate-600 font-medium block mb-3 mt-1.5">
          Nota (opcional)
          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: cambio por disponibilidad" className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm" />
        </label>
        {error && <div className="text-xs text-[#B6522F] mb-2.5">{error}</div>}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => guardar(false)} disabled={guardando || !profesionalId} className="text-xs text-white px-3 py-1.5 rounded-lg disabled:opacity-40" style={{ background: '#4C7C74' }}>
            Guardar
          </button>
          <button onClick={() => guardar(true)} disabled={guardando} className="text-xs text-slate-600 px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40">
            Marcar vacante
          </button>
          {overrideActual && (
            <button onClick={quitarSustitucion} disabled={guardando} className="text-xs text-[#B6522F] px-3 py-1.5 rounded-lg border border-[#F2D9CC] disabled:opacity-40">
              Quitar sustitución
            </button>
          )}
          <button onClick={onCancelar} className="text-xs text-slate-400 px-3 py-1.5 rounded-lg ml-auto">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function TurnoRosterTab({ roster, servicioId, agendaId, profesionales, puedeEditar, bloquesAgenda, vigenciaDesde, vigenciaHasta }) {
  const [mesInicio, setMesInicio] = useState(() => {
    const primeraFecha = roster?.dias?.[0]?.date;
    if (primeraFecha) {
      const [y, m] = primeraFecha.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return primerDiaMes(new Date());
  });
  const [datosMes, setDatosMes] = useState(roster || null);
  const [cargando, setCargando] = useState(false);
  const [detalleAbierto, setDetalleAbierto] = useState(null);
  const [dialogoRotacion, setDialogoRotacion] = useState(null); // { rotacion: null|obj }
  const [rotacionExpandida, setRotacionExpandida] = useState(null);
  const [edicionDia, setEdicionDia] = useState(null); // { fechaISO, unidad, puesto, rotacion, entry } | null

  const cargarMes = React.useCallback(() => {
    if (!servicioId) return;
    setCargando(true);
    const desde = fechaISO(mesInicio);
    const hasta = fechaISO(new Date(mesInicio.getFullYear(), mesInicio.getMonth() + 1, 0));
    return fetchShiftRoster(servicioId, desde, hasta)
      .then((data) => setDatosMes(data))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [servicioId, mesInicio]);

  useEffect(() => {
    setDetalleAbierto(null);
    cargarMes();
  }, [cargarMes]);

  const datosServidor = datosMes || roster;
  // Vínculo con la agenda abierta: sus turnos fijos se toman del estado local (no de lo último que
  // devolvió el servidor), así lo que se agrega/quita en la tabla o en el planificador semanal se
  // refleja al instante en el calendario, sin esperar a que se guarde y se recargue.
  const datos = datosServidor && bloquesAgenda ? {
    ...datosServidor,
    puestos: Array.from(new Set([...(datosServidor.puestos || []), ...(bloquesAgenda.some((b) => b.esTurno) ? bloquesAgenda.filter((b) => b.esTurno).map((b) => b.actividad || 'Turno') : [])])),
    dias: (datosServidor.dias || []).map((d) => {
      const enVigencia = (!vigenciaDesde || d.date >= vigenciaDesde) && (!vigenciaHasta || d.date <= vigenciaHasta);
      const otros = d.entries.filter((e) => !(e.origen === 'agenda' && e.agendaId === agendaId));
      if (!enVigencia) return { ...d, entries: otros };
      const [y, m, dd] = d.date.split('-').map(Number);
      const diaNombre = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date(y, m - 1, dd).getDay()];
      const propios = bloquesAgenda.filter((b) => b.esTurno && b.dia === diaNombre).map((b) => ({
        unidad: 'Agenda', puesto: b.actividad || 'Turno', startMinutes: b.inicioMin, durationMinutes: b.duracionMin,
        professionalId: b.profesionalId, professionalName: profesionales.find((p) => p.id === b.profesionalId)?.nombre || 'Profesional',
        esSustitucion: false, tramoSplit: null, origen: 'agenda', agendaId,
      }));
      return { ...d, entries: [...propios, ...otros] };
    }),
  } : datosServidor;
  if (!datos) {
    return <div className="text-sm text-slate-400 italic text-center py-10">Cargando turno rotativo…</div>;
  }

  const puestos = datos.puestos || [];
  const diaPorFecha = new Map((datos.dias || []).map((d) => [d.date, d]));
  const primerDia = primerDiaMes(mesInicio);
  const diasEnMes = new Date(mesInicio.getFullYear(), mesInicio.getMonth() + 1, 0).getDate();
  const celdasVacias = diaSemanaLunesPrimero(primerDia);
  const celdas = [];
  for (let i = 0; i < celdasVacias; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(new Date(mesInicio.getFullYear(), mesInicio.getMonth(), d));
  while (celdas.length % 7 !== 0) celdas.push(null);
  const semanas = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));

  const conteos = [...(datos.turnosUltimos30Dias || [])].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMesInicio((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg border border-slate-200"
        >
          ‹ Anterior
        </button>
        <div className="text-sm font-semibold text-slate-800 capitalize min-w-[160px] text-center">
          {mesInicio.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
        </div>
        <button
          onClick={() => setMesInicio((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg border border-slate-200"
        >
          Siguiente ›
        </button>
        {cargando && <span className="text-[11px] text-slate-400">Cargando…</span>}
        <div className="flex items-center gap-3 ml-auto">
          {puestos.map((puesto, i) => (
            <div key={puesto} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: PUESTO_COLORES[i % PUESTO_COLORES.length] }} />
              <span className="text-[11px] text-slate-500">{puesto}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 text-slate-500 text-[11px] font-medium">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="px-2 py-1.5 text-center border-b border-slate-100">{d}</div>
            ))}
          </div>
          {semanas.map((semana, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {semana.map((fecha, di) => {
                if (!fecha) {
                  return <div key={di} className="border-t border-r border-slate-100 min-h-[64px] bg-slate-50/40" />;
                }
                const dia = diaPorFecha.get(fechaISO(fecha));
                return (
                  <div key={di} className="border-t border-r border-slate-100 min-h-[64px] p-1.5">
                    <div className="text-[11px] text-slate-400">{fecha.getDate()}</div>
                    <div className="space-y-0.5 mt-0.5">
                      {puestos.map((puesto, i) => {
                        // Un día con cobertura dividida (feriado legal cubierto día/noche por 2
                        // personas) trae DOS entries para el mismo puesto — hay que mostrarlas
                        // ambas, no solo la primera.
                        const entradas = (dia?.entries || []).filter((e) => e.puesto === puesto);
                        const rotacion = (datos.rotaciones || []).find((r) => r.puesto === puesto && r.unidad === entradas[0]?.unidad);
                        const abrirEdicion = (entry) => {
                          if (!puedeEditar || !rotacion) return;
                          setEdicionDia({ fechaISO: fechaISO(fecha), fecha, unidad: rotacion.unidad, puesto, rotacion, entry: entry || null });
                        };
                        if (entradas.length === 0 || !entradas.some((e) => e.professionalName)) {
                          return rotacion ? (
                            <button
                              key={puesto}
                              onClick={() => abrirEdicion(null)}
                              disabled={!puedeEditar}
                              className="w-full text-[10px] px-1 py-0.5 rounded truncate text-left text-slate-300 border border-dashed border-slate-200 hover:border-slate-300 hover:text-slate-400"
                            >
                              {puesto} —
                            </button>
                          ) : null;
                        }
                        return entradas.map((entry, ei) => {
                          if (!entry.professionalName) return null;
                          const horario = `${hhmmDesdeMin(entry.startMinutes % 1440)}–${hhmmDesdeMin((entry.startMinutes + entry.durationMinutes) % 1440)}${entry.startMinutes + entry.durationMinutes > 1440 ? ' (+1)' : ''}`;
                          const [primerNombre] = entry.professionalName.split(' ');
                          const etiquetaTramo = entry.tramoSplit === 'dia' ? ' (d)' : entry.tramoSplit === 'noche' ? ' (n)' : '';
                          return (
                            <button
                              key={`${puesto}-${ei}`}
                              onClick={() => abrirEdicion(entry)}
                              disabled={!puedeEditar}
                              title={`${puesto}: ${entry.professionalName} · ${horario}${entry.esSustitucion ? ' (sustitución)' : ''}${entry.origen === 'agenda' ? ' · turno fijo semanal de la agenda (se edita en la agenda del profesional)' : puedeEditar ? ' — clic para editar' : ''}`}
                              className="w-full text-[10px] px-1 py-0.5 rounded truncate text-left hover:opacity-70"
                              style={{
                                background: `${PUESTO_COLORES[i % PUESTO_COLORES.length]}1A`,
                                color: PUESTO_COLORES[i % PUESTO_COLORES.length],
                                ...(entry.origen === 'agenda' ? { borderLeft: `2px solid ${PUESTO_COLORES[i % PUESTO_COLORES.length]}` } : {}),
                              }}
                            >
                              {primerNombre}{etiquetaTramo}{entry.esSustitucion && ' *'}{entry.origen === 'agenda' && <span className="opacity-60"> · fijo</span>}
                            </button>
                          );
                        });
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {puestos.length > 0 && (
          <div className="text-[11px] text-slate-400 mt-1.5">
            * = sustitución puntual sobre lo que calcula el ciclo.
            {datos.puestosFijosAgenda?.length > 0 && (
              <> · «fijo» = turno semanal cargado en la agenda de cada profesional ({datos.puestosFijosAgenda.join(', ')}); se modifica desde la agenda, no desde las rotaciones.</>
            )}
          </div>
        )}
      </div>

      {puedeEditar && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rotaciones configuradas</div>
            <button
              onClick={() => setDialogoRotacion({ rotacion: null })}
              className="text-xs text-[#4C7C74] font-medium hover:underline flex items-center gap-1"
            >
              <Plus size={13} /> Nueva rotación
            </button>
          </div>
          <div className="space-y-2">
            {(datos.rotaciones || []).map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{r.unidad} — {r.puesto}</div>
                    <div className="text-[11px] text-slate-400">Ciclo de {r.cycleDays} días · ancla {formatoFechaCorta(r.anchorDate)} · {r.members.length} posiciones</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setRotacionExpandida(rotacionExpandida === r.id ? null : r.id)} className="text-xs text-slate-500 hover:underline">
                      Sustituciones ({r.overrides.length})
                    </button>
                    <button onClick={() => setDialogoRotacion({ rotacion: r })} className="text-xs text-[#4C7C74] hover:underline">Editar</button>
                    <button
                      onClick={async () => {
                        if (!confirm(`¿Eliminar la rotación ${r.unidad} — ${r.puesto}? Deja de calcularse, pero no se borra el historial.`)) return;
                        await deleteShiftRotation(servicioId, r.id);
                        await cargarMes();
                      }}
                      className="text-xs text-[#B6522F] hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                {rotacionExpandida === r.id && (
                  <SustitucionesPanel
                    rotacion={r}
                    servicioId={servicioId}
                    profesionales={profesionales}
                    onCambio={cargarMes}
                  />
                )}
              </div>
            ))}
            {(datos.rotaciones || []).length === 0 && (
              <div className="text-xs text-slate-400 italic bg-white rounded-xl border border-slate-200 p-4 text-center">Sin rotaciones configuradas todavía.</div>
            )}
          </div>
        </div>
      )}

      {dialogoRotacion && (
        <RotacionDialog
          rotacion={dialogoRotacion.rotacion}
          servicioId={servicioId}
          agendaId={agendaId}
          profesionales={profesionales}
          onCancelar={() => setDialogoRotacion(null)}
          onGuardado={async () => {
            setDialogoRotacion(null);
            await cargarMes();
          }}
        />
      )}

      {edicionDia && (
        <EditarTurnoDiaDialog
          edicion={edicionDia}
          servicioId={servicioId}
          profesionales={profesionales}
          onCancelar={() => setEdicionDia(null)}
          onGuardado={async () => {
            setEdicionDia(null);
            await cargarMes();
          }}
        />
      )}

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Agenda efectiva y horas pendientes por recuperar — {mesInicio.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Profesional</th>
                <th className="text-right px-3 py-2 font-medium">Jornada nominal</th>
                <th className="text-right px-3 py-2 font-medium">Perdidas por turno</th>
                <th className="text-right px-3 py-2 font-medium">Agenda efectiva</th>
                <th className="text-right px-3 py-2 font-medium">Pendiente por recuperar</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {(datos.proyeccion || []).map((p) => {
                const expandido = detalleAbierto === p.professionalId;
                const tieneDetalle = (p.detalle || []).length > 0;
                return (
                  <React.Fragment key={p.professionalId}>
                    <tr
                      className={`border-t border-slate-100 ${tieneDetalle ? 'cursor-pointer hover:bg-slate-50/60' : ''}`}
                      onClick={() => tieneDetalle && setDetalleAbierto(expandido ? null : p.professionalId)}
                    >
                      <td className="px-3 py-1.5 text-slate-700">{p.professionalName}</td>
                      <td className="px-3 py-1.5 text-right text-slate-600">{p.horasJornadaNominal.toFixed(1)} hrs</td>
                      <td className="px-3 py-1.5 text-right text-slate-600">{p.horasPerdidasPorTurno.toFixed(1)} hrs</td>
                      <td className="px-3 py-1.5 text-right text-slate-600">{p.horasEfectivas.toFixed(1)} hrs</td>
                      <td className="px-3 py-1.5 text-right font-semibold" style={{ color: p.horasPerdidasPorTurno > 0 ? '#B6522F' : '#94a3b8' }}>
                        {p.horasPerdidasPorTurno > 0 ? `${p.horasPerdidasPorTurno.toFixed(1)} hrs` : '—'}
                      </td>
                      <td className="px-2 text-center text-slate-400">{tieneDetalle && (expandido ? '▲' : '▼')}</td>
                    </tr>
                    {expandido && tieneDetalle && (
                      <tr className="border-t border-slate-100 bg-slate-50/50">
                        <td colSpan={6} className="px-3 py-2">
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Detalle de días perdidos</div>
                          <div className="flex flex-wrap gap-1.5">
                            {p.detalle.map((d) => (
                              <span key={d.date} className="inline-flex items-center gap-1 text-[10px] bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-600">
                                {formatoFechaCorta(d.date)} ({d.weekday}) — {d.horas.toFixed(1)} hrs
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {(datos.proyeccion || []).length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400 italic">Sin jornada cargada que cruce con turno en este mes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-[11px] text-slate-400 mt-1.5">
          Calculado cruzando la jornada semanal cargada (plantilla por día) con las fechas reales en que el ciclo de turno le toca a cada profesional — asume que un día de turno de 24h desplaza por completo la jornada de ese mismo día. "Pendiente por recuperar" es la señal para programar esas horas de vuelta en otra semana del ciclo, no algo que la app reprograma sola.
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Turnos por profesional (últimos 30 días)</div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Profesional</th>
                <th className="text-right px-3 py-2 font-medium">Turnos</th>
              </tr>
            </thead>
            <tbody>
              {conteos.map((c) => (
                <tr key={c.professionalName} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-slate-700">{c.professionalName}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600 font-medium">{c.count}</td>
                </tr>
              ))}
              {conteos.length === 0 && (
                <tr><td colSpan={2} className="px-3 py-6 text-center text-slate-400 italic">Sin turnos en los últimos 30 días.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-[11px] text-slate-400 mt-1.5">Esto es carga de turno (Art. 15), no horas de jornada (Art. 19) — se muestran por separado a propósito. Úsalos juntos para decidir cuánta jornada extra programar en las semanas sin turno.</div>
      </div>
    </div>
  );
}

// Planificador semanal de turnos: muestra los bloques de turno de la agenda organizados por día
// (no por profesional) y permite agregarlos/quitarlos desde aquí. Cada turno es un bloque de la
// agenda con esTurno, igual que marcar la casilla Turno en la tabla del profesional.
const DIAS_TURNO = [...DIAS, 'Domingo'];
function PlanificadorTurnosSemana({ profesionales, bloques, soloLectura, onAgregarTurno, onEditarBloque, onEliminarBloque }) {
  const [formDia, setFormDia] = useState(null); // día con el formulario abierto
  const [profId, setProfId] = useState('');
  const [inicio, setInicio] = useState('08:00');
  const [horas, setHoras] = useState(24);
  const nombrePorId = useMemo(() => Object.fromEntries(profesionales.map((p) => [p.id, p.nombre])), [profesionales]);
  const turnos = bloques.filter((b) => b.esTurno);
  const profesionalesOrdenados = useMemo(() => [...profesionales].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [profesionales]);

  function abrir(dia) {
    setFormDia(dia);
    setProfId('');
    setInicio('08:00');
    setHoras(24);
  }
  function confirmar() {
    if (!profId || !inicio) return;
    const [h, m] = inicio.split(':').map(Number);
    onAgregarTurno(profId, formDia, h * 60 + m, Math.max(1, Number(horas) || 24) * 60);
    setFormDia(null);
  }

  return (
    <div className="mb-6">
      <div className="flex items-end justify-between flex-wrap gap-2 mb-2">
        <div>
          <div className="text-sm font-semibold text-slate-800">Turnos semanales de la agenda</div>
          <div className="text-[11px] text-slate-500">
            Organizados por día. {soloLectura ? '' : 'Usa «+ Agregar» en cada día para asignar un turno; queda guardado en la agenda del profesional.'}
          </div>
        </div>
        <div className="text-[11px] text-slate-500">{turnos.length} turno{turnos.length === 1 ? '' : 's'} · {fmtHorasTurno(turnos.reduce((s, b) => s + b.duracionMin, 0))}</div>
      </div>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {DIAS_TURNO.map((dia) => {
          const delDia = turnos.filter((b) => b.dia === dia).sort((a, b) => a.inicioMin - b.inicioMin);
          return (
            <div key={dia} className="rounded-xl border border-slate-200 bg-white p-2 flex flex-col min-h-[110px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700">{dia}</span>
                <span className="text-[10px] text-slate-400">{delDia.length || ''}</span>
              </div>
              <div className="space-y-1 flex-1">
                {delDia.length === 0 && <div className="text-[10px] text-slate-300 italic">Sin turnos</div>}
                {delDia.map((b) => (
                  <div key={b.id} className="group rounded-lg bg-[#FBEEE8] px-2 py-1 text-[11px] flex items-start gap-1">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate" title={nombrePorId[b.profesionalId]}>{nombrePorId[b.profesionalId] || 'Profesional'}</div>
                      <div className="text-[10px] text-[#B6522F]">
                        {hhmmDesdeMin(b.inicioMin)} – {horaFinTexto(b.inicioMin, b.duracionMin)} · {fmtHorasTurno(b.duracionMin)}
                      </div>
                    </div>
                    {!soloLectura && (
                      <>
                        <select
                          value={b.dia}
                          onChange={(e) => onEditarBloque(b.id, { dia: e.target.value })}
                          title="Mover a otro día"
                          className="text-[10px] bg-transparent text-slate-500 w-5 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          {DIAS_TURNO.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <button onClick={() => onEliminarBloque(b.id)} title="Quitar turno" className="text-slate-400 hover:text-[#B6522F] opacity-0 group-hover:opacity-100">
                          <X size={12} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {!soloLectura && (formDia === dia ? (
                <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                  <select value={profId} onChange={(e) => setProfId(e.target.value)} className="w-full text-[11px] rounded border border-slate-300 px-1 py-1 bg-white">
                    <option value="">Profesional…</option>
                    {profesionalesOrdenados.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} className="flex-1 min-w-0 text-[11px] rounded border border-slate-300 px-1 py-1" title="Hora de inicio" />
                    <select value={horas} onChange={(e) => setHoras(Number(e.target.value))} className="text-[11px] rounded border border-slate-300 px-1 py-1 bg-white" title="Duración">
                      {[24, 12, 8, 6, 4].map((h) => <option key={h} value={h}>{h} h</option>)}
                    </select>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={confirmar} disabled={!profId} style={{ background: '#4C7C74' }} className="flex-1 text-[11px] text-white rounded px-2 py-1 disabled:opacity-40">Agregar</button>
                    <button onClick={() => setFormDia(null)} className="text-[11px] text-slate-500 px-1">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => abrir(dia)} className="mt-2 text-[11px] text-[#4C7C74] font-medium flex items-center gap-1 hover:underline">
                  <Plus size={12} /> Agregar
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
function fmtHorasTurno(min) {
  const h = min / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1).replace('.', ',')} h`;
}

function EditorProgramacion({ titulo, subtitulo, estado, role, esNueva, especialidad, servicioId, agendaId, vigenciaDesde, vigenciaHasta, profesionales, bloques, cnePct, atenciones, onEditarCne, onEditarAtenciones, onDescartar, onGuardarBorrador, onCerrar, onEnviar, onAgregarProfesional, onEliminarProfesional, onRenombrarProfesional, onLimpiarProfesional, onAgregarBloque, onAgregarTurno, onEditarBloque, onEliminarBloque }) {
  const [activoId, setActivoId] = useState(profesionales[0]?.id || null);
  const [dialogo, setDialogo] = useState(null);
  const [soloBecados, setSoloBecados] = useState(false);
  const [roster, setRoster] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!servicioId) return;
    // Mes inicial del calendario de turno: el mes actual, salvo que la agenda rija más adelante
    // (ej. agenda 2027 abierta en noviembre 2026) — ahí se parte en su primer mes de vigencia,
    // para que se vean los turnos marcados en ESTA agenda y no los de la vigente hoy.
    let inicio = primerDiaMes(new Date());
    if (vigenciaDesde) {
      const [y, m] = String(vigenciaDesde).slice(0, 10).split('-').map(Number);
      const inicioVigencia = new Date(y, m - 1, 1);
      if (inicioVigencia > inicio) inicio = inicioVigencia;
    }
    const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);
    fetchShiftRoster(servicioId, fechaISO(inicio), fechaISO(fin))
      .then((data) => { if (!cancelled) setRoster(data); })
      .catch(() => { if (!cancelled) setRoster(null); });
    return () => { cancelled = true; };
  }, [servicioId, vigenciaDesde]);

  const puedeEditarTurno = role === 'jefe_servicio' || role === 'admin';
  // Sin esto, un servicio que todavía no tiene ninguna rotación cargada nunca podría mostrar el
  // botón "Nueva rotación" — el jefe de servicio necesita ver la pestaña para poder crear la
  // primera. Un usuario de solo lectura solo la ve si ya hay turno real cargado.
  const hayRoster = puedeEditarTurno
    || (role === 'referente_programacion' && estado === 'enviada')
    || bloques.some((b) => b.esTurno)
    || roster?.dias?.some((d) => d.entries.some((e) => e.professionalName));
  const profesional = profesionales.find((p) => p.id === activoId) || null;
  // El referente de programación puede corregir una agenda que el servicio le envió; los cambios
  // se guardan al instante (no hay "guardar borrador" ni "enviar" en ese modo).
  const modoCorreccion = role === 'referente_programacion' && estado === 'enviada';
  // "Guardar borrador" guarda y se queda en la agenda (solo la X cierra).
  const [estadoGuardado, setEstadoGuardado] = useState(null); // null | 'guardando' | 'guardado'
  async function guardarSinSalir() {
    setEstadoGuardado('guardando');
    try {
      await onGuardarBorrador(false);
      setEstadoGuardado('guardado');
      setTimeout(() => setEstadoGuardado(null), 2500);
    } catch (_error) {
      setEstadoGuardado(null);
    }
  }
  const soloLectura = !(role === 'jefe_servicio' && estado === 'borrador') && !modoCorreccion;
  const hayBecados = profesionales.some((p) => p.nivelFormacion);
  const profesionalesListados = soloBecados ? profesionales.filter((p) => p.nivelFormacion) : profesionales;
  // Topes de horario por profesional (bloques que se superponen el mismo día).
  const topesAgenda = useMemo(() => detectarTopes(bloques), [bloques]);
  const topesPorProfesional = useMemo(() => {
    const m = new Map();
    bloques.forEach((b) => { if (topesAgenda.has(b.id)) m.set(b.profesionalId, (m.get(b.profesionalId) || 0) + 1); });
    return m;
  }, [bloques, topesAgenda]);
  const primeroConTopes = profesionales.find((p) => topesPorProfesional.has(p.id));
  function enviarConRevision() {
    if (topesAgenda.size > 0 && !window.confirm(`Hay ${topesAgenda.size} bloques que se superponen en ${topesPorProfesional.size} profesional(es). ¿Enviar de todas formas?`)) {
      if (primeroConTopes) setActivoId(primeroConTopes.id);
      return;
    }
    onEnviar();
  }

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col print-reset-ancestor">
      <div className="border-b border-slate-200 px-3 md:px-5 py-3 md:py-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 shrink-0 bg-white no-imprimir">
        <div className="min-w-0">
          <div className="font-semibold text-slate-800">Programación — {titulo}</div>
          <div className="text-xs text-slate-500">
            {subtitulo}{soloLectura ? ' · Solo lectura' : ''}
            {topesAgenda.size > 0 && (
              <button
                onClick={() => primeroConTopes && setActivoId(primeroConTopes.id)}
                className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#9B2C2C] bg-[#FDECEC] px-2 py-0.5 rounded-full hover:underline"
                title="Ir al primer profesional con bloques superpuestos"
              >
                <AlertTriangle size={11} /> {topesAgenda.size} bloques superpuestos en {topesPorProfesional.size} profesional{topesPorProfesional.size === 1 ? '' : 'es'}
              </button>
            )}
            {modoCorreccion && (
              <span className="ml-2 inline-block text-[10px] font-semibold text-[#8A5A00] bg-[#FDF3DC] px-2 py-0.5 rounded-full">
                Corrección del Referente · los cambios se guardan al instante
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {activoId === '__resumen__' && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs text-slate-600 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
              title="Genera un PDF del resumen general para enviar como comprobante de revisión"
            >
              <Download size={13} /> Descargar PDF
            </button>
          )}
          {esNueva && (
            <button onClick={() => setDialogo({ tipo: 'descartar' })} className="text-xs text-[#B6522F] hover:underline mr-1">
              Descartar
            </button>
          )}
          {!soloLectura && !modoCorreccion && (
            <button onClick={enviarConRevision} style={{ background: '#4C7C74' }} className="flex items-center gap-1.5 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
              <Send size={13} /> Enviar a Referente
            </button>
          )}
          {modoCorreccion ? (
            <button onClick={onCerrar} style={{ background: '#4C7C74' }} className="text-white text-xs font-medium px-3 py-1.5 rounded-lg">
              Terminar corrección
            </button>
          ) : soloLectura ? (
            <button onClick={onCerrar} className="text-xs text-slate-600 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
              Cerrar
            </button>
          ) : (
            <button
              onClick={guardarSinSalir}
              disabled={estadoGuardado === 'guardando'}
              className="text-xs text-slate-600 font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              {estadoGuardado === 'guardando' && <Loader2 size={12} className="animate-spin" />}
              {estadoGuardado === 'guardado' && <CheckCircle2 size={12} className="text-[#4C7C74]" />}
              {estadoGuardado === 'guardado' ? 'Guardado' : 'Guardar borrador'}
            </button>
          )}
          <button
            onClick={soloLectura || modoCorreccion ? onCerrar : () => onGuardarBorrador(true)}
            className="text-slate-400 hover:text-slate-700"
            title={soloLectura || modoCorreccion ? 'Cerrar' : 'Guardar y cerrar'}
          ><X size={20} /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden bg-white print-reset-ancestor">
        <div className="w-36 md:w-48 shrink-0 border-r border-slate-200 bg-white overflow-y-auto py-2 no-imprimir">
          <button
            onClick={() => setActivoId('__resumen__')}
            className={`w-full flex items-center gap-1.5 text-left px-3 py-2 border-l-2 transition-colors ${activoId === '__resumen__' ? 'bg-[#EBF5F2] border-[#4C7C74] text-slate-800 font-semibold' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
          >
            <BarChart3 size={13} /> <span className="text-xs">Resumen general</span>
          </button>
          {hayRoster && (
            <button
              onClick={() => setActivoId('__turno__')}
              className={`w-full flex items-center gap-1.5 text-left px-3 py-2 border-l-2 transition-colors ${activoId === '__turno__' ? 'bg-[#EBF5F2] border-[#4C7C74] text-slate-800 font-semibold' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
            >
              <History size={13} /> <span className="text-xs">Turno rotativo</span>
            </button>
          )}
          <div className="px-3 pt-2 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-t border-slate-100 mt-1">Profesionales</div>
          {hayBecados && (
            <label className="flex items-center gap-1.5 px-3 pb-1.5 text-[10px] text-slate-500 cursor-pointer">
              <input type="checkbox" checked={soloBecados} onChange={(e) => setSoloBecados(e.target.checked)} />
              Solo becados
            </label>
          )}
          {profesionalesListados.map((p) => (
            <div key={p.id} className={`group flex items-center border-l-2 transition-colors ${p.id === activoId ? 'bg-[#EBF5F2] border-[#4C7C74]' : 'border-transparent hover:bg-slate-50'}`}>
              <button
                onClick={() => setActivoId(p.id)}
                className={`flex-1 text-left px-3 py-2 truncate ${p.id === activoId ? 'text-slate-800' : 'text-slate-500'}`}
              >
                <div className={`text-xs truncate ${p.id === activoId ? 'font-semibold' : ''}`}>
                  {p.rut && <IdCard size={11} className="inline-block mr-1 -mt-0.5 text-[#4C7C74]" strokeWidth={2.2} />}
                  {p.nombre}
                  {p.nivelFormacion && (
                    <span className="ml-1.5 inline-block text-[9px] font-semibold text-[#7A5CC7] bg-[#F1EDFB] px-1.5 py-0.5 rounded-full align-middle">{p.nivelFormacion}</span>
                  )}
                  {p.esSoloTurno ? (
                    <span className="ml-1.5 inline-block text-[9px] font-semibold text-[#B6522F] bg-[#FBEEE8] px-1.5 py-0.5 rounded-full align-middle">Solo turno</span>
                  ) : p.tieneTurno && (
                    <span className="ml-1.5 inline-block text-[9px] font-semibold text-[#B6522F] bg-[#FBEEE8] px-1.5 py-0.5 rounded-full align-middle">Turno</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">
                  {p.tipo || 'Sin tipo'}
                  {p.especialidad && p.especialidad !== especialidad && <span className="text-[#4C7C74]"> · {p.especialidad}</span>}
                  {topesPorProfesional.has(p.id) && (
                    <span className="text-[#DC2626] font-semibold"> · {topesPorProfesional.get(p.id)} superpuestos</span>
                  )}
                </div>
              </button>
              {!soloLectura && (
                <button
                  onClick={() => setDialogo({ tipo: 'editar', profesionalId: p.id, nombreInicial: p.nombre, tipoInicial: p.tipo, nivelFormacionInicial: p.nivelFormacion, tieneTurnoInicial: p.tieneTurno, rutInicial: p.rut, especialidadInicial: p.especialidad })}
                  className="pr-2 text-slate-400 hover:text-[#4C7C74]"
                  title="Editar"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          ))}
          {!soloLectura && (
            <button
              onClick={() => setDialogo({ tipo: 'agregar' })}
              className="w-full text-left px-3 py-2.5 text-xs text-[#4C7C74] font-medium flex items-center gap-1.5 hover:bg-slate-50 mt-1 border-t border-slate-100"
            >
              <Plus size={13} /> Nuevo profesional
            </button>
          )}
        </div>

        <div className="flex-1 min-w-0 overflow-y-auto p-3 md:p-5 bg-white print-reset-ancestor">
          {activoId === '__resumen__' ? (
            <div id="resumen-imprimible">
              <div className="hidden print:block mb-4">
                <div className="text-base font-semibold text-slate-800">Resumen general — {titulo}</div>
                <div className="text-xs text-slate-500">{subtitulo} · Comprobante generado el {new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
              <ResumenAgendaTab
                profesionales={profesionales}
                bloques={bloques}
                proyeccionTurno={roster?.proyeccion}
                servicio={titulo}
              />
            </div>
          ) : activoId === '__turno__' ? (
            <>
              <PlanificadorTurnosSemana
                profesionales={profesionales}
                bloques={bloques}
                soloLectura={soloLectura}
                onAgregarTurno={onAgregarTurno}
                onEditarBloque={onEditarBloque}
                onEliminarBloque={onEliminarBloque}
              />
              <div className="text-sm font-semibold text-slate-800 mb-2">Calendario mensual</div>
              <TurnoRosterTab roster={roster} servicioId={servicioId} agendaId={agendaId} profesionales={profesionales} puedeEditar={puedeEditarTurno} bloquesAgenda={bloques} vigenciaDesde={vigenciaDesde} vigenciaHasta={vigenciaHasta} />
            </>
          ) : !profesional ? (
            <div className="text-sm text-slate-400 italic text-center py-10">Sin profesionales cargados en esta agenda.</div>
          ) : (
            <div className="flex flex-col 2xl:flex-row gap-5 items-stretch 2xl:items-start">
              <div className="flex-1 min-w-0">
                <TablaAgendaProfesional
                  profesional={profesional}
                  especialidad={profesional.especialidad || especialidad}
                  servicio={titulo}
                  soloLectura={soloLectura}
                  bloques={bloques.filter((b) => b.profesionalId === profesional.id)}
                  onAgregarFila={(anterior, siguiente) => onAgregarBloque(profesional.id, anterior, siguiente)}
                  onEditarFila={(id, cambios) => onEditarBloque(id, cambios)}
                  onEliminarFila={(id) => onEliminarBloque(id)}
                  onLimpiar={() => setDialogo({ tipo: 'limpiar', profesionalId: profesional.id, nombre: profesional.nombre })}
                  onEliminarProfesional={() => setDialogo({ tipo: 'eliminarProfesional', profesionalId: profesional.id, nombre: profesional.nombre })}
                />
              </div>
              <ResumenProfesionalPanel bloques={bloques.filter((b) => b.profesionalId === profesional.id)} />
            </div>
          )}
        </div>
      </div>

      {dialogo?.tipo === 'agregar' && (
        <ProfesionalDialog
          titulo="Nuevo profesional"
          especialidadServicio={especialidad}
          onCancelar={() => setDialogo(null)}
          onConfirmar={async (nombre, tipoProf, nivelFormacion, tieneTurno, rut, especialidadProf) => {
            const nuevoId = await onAgregarProfesional(nombre, tipoProf, nivelFormacion, tieneTurno, rut, especialidadProf);
            setActivoId(nuevoId);
            setDialogo(null);
          }}
        />
      )}
      {dialogo?.tipo === 'editar' && (
        <ProfesionalDialog
          titulo="Editar profesional"
          nombreInicial={dialogo.nombreInicial}
          tipoInicial={dialogo.tipoInicial}
          nivelFormacionInicial={dialogo.nivelFormacionInicial}
          tieneTurnoInicial={dialogo.tieneTurnoInicial}
          rutInicial={dialogo.rutInicial}
          especialidadInicial={dialogo.especialidadInicial}
          especialidadServicio={especialidad}
          onCancelar={() => setDialogo(null)}
          onConfirmar={async (nombre, tipoProf, nivelFormacion, tieneTurno, rut, especialidadProf) => {
            await onRenombrarProfesional(dialogo.profesionalId, nombre, tipoProf, nivelFormacion, tieneTurno, rut, especialidadProf);
            setDialogo(null);
          }}
        />
      )}
      {dialogo?.tipo === 'limpiar' && (
        <ConfirmDialog
          mensaje={`¿Vaciar la programación de ${dialogo.nombre} y comenzar en blanco?`}
          destructivo
          onCancelar={() => setDialogo(null)}
          onConfirmar={async () => {
            await onLimpiarProfesional(dialogo.profesionalId);
            setDialogo(null);
          }}
        />
      )}
      {dialogo?.tipo === 'eliminarProfesional' && (
        <ConfirmDialog
          mensaje={`¿Eliminar a ${dialogo.nombre} de esta agenda?`}
          destructivo
          onCancelar={() => setDialogo(null)}
          onConfirmar={async () => {
            await onEliminarProfesional(dialogo.profesionalId);
            setActivoId((profesionales.find((p) => p.id !== dialogo.profesionalId) || {}).id || null);
            setDialogo(null);
          }}
        />
      )}
      {dialogo?.tipo === 'descartar' && (
        <ConfirmDialog
          mensaje="¿Descartar esta agenda? No quedará guardada ni aparecerá en el tablero."
          destructivo
          onCancelar={() => setDialogo(null)}
          onConfirmar={onDescartar}
        />
      )}
    </div>
  );
}

function AgendaDetail({ agenda, role, onClose, onAction, onGenerarResumen, resumenLoading, onAbrirEditor }) {
  const chartProceso = PROCESOS_CAT.map((p) => ({ proceso: p, horas: agenda.horas[p] || 0 }));
  const chartTrazadoras = horasPorActividad(agenda.bloquesProf).slice(0, 10);
  const total = totalHorasAgenda(agenda.horas);
  const rendimiento = total > 0 ? (agenda.atenciones / total).toFixed(2) : '0.00';
  const puedeEditar = (agenda.estado === 'borrador' && role === 'jefe_servicio')
    || (agenda.estado === 'enviada' && role === 'referente_programacion');
  const cuposSemanalesAgenda = agenda.bloquesProf.filter((b) => !b.esTurno).reduce((s, b) => s + (b.rendimiento || 0) * (b.duracionMin / 60), 0);
  const produccionAnual = Math.round(cuposSemanalesAgenda * SEMANAS_POR_ANIO * (1 - AUSENTISMO_PCT / 100));
  const [extendiendo, setExtendiendo] = useState(false);
  const [nuevaVigenciaHasta, setNuevaVigenciaHasta] = useState(agenda.vigenciaHasta || '');
  const puedeExtenderVigencia = agenda.estado === 'aprobada' && (role === 'jefe_servicio' || role === 'referente_programacion' || role === 'admin');

  return (
    <div className="fixed inset-0 flex items-stretch justify-end z-50" style={{ background: 'rgba(30,46,51,0.45)' }} onClick={onClose}>
      <div
        className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-800">{agenda.servicio}</div>
            <div className="text-xs text-slate-500 font-mono">#{agenda.id} · v{agenda.version} · {agenda.mes}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge estado={agenda.estado} />
            <BadgeCopia agenda={agenda} />
            {!esVigente(agenda) && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-100 text-slate-500 border-slate-300">
                No vigente{agenda.vigenciaHasta ? ` desde ${formatoFechaCorta(agenda.vigenciaHasta)}` : ''}
              </span>
            )}
            {puedeExtenderVigencia && !extendiendo && (
              <button onClick={() => setExtendiendo(true)} className="text-xs text-[#4C7C74] font-medium hover:underline">
                Extender vigencia
              </button>
            )}
          </div>

          {extendiendo && (
            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="text-xs font-medium text-slate-600">Nueva fecha de término de vigencia</div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={nuevaVigenciaHasta}
                  min={agenda.vigenciaHasta || undefined}
                  onChange={(e) => setNuevaVigenciaHasta(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4C7C74]/40"
                />
                <button
                  onClick={() => { onAction('extender_vigencia', agenda, { vigenciaHasta: nuevaVigenciaHasta }); setExtendiendo(false); }}
                  disabled={!nuevaVigenciaHasta || (agenda.vigenciaHasta && nuevaVigenciaHasta <= agenda.vigenciaHasta)}
                  style={{ background: '#4C7C74' }}
                  className="text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-40"
                >
                  Confirmar
                </button>
                <button onClick={() => setExtendiendo(false)} className="text-xs text-slate-400 hover:text-slate-600 px-1">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {agenda.motivoRechazo && (
            <div className="text-xs bg-[#FBEEE8] border border-[#B6522F]/30 text-[#B6522F] rounded-lg p-3">
              <span className="font-semibold">Motivo de rechazo: </span>{agenda.motivoRechazo}
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Horas por proceso</div>
            <div className="bg-white rounded-xl border border-slate-200 p-3" style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartProceso} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="proceso" tick={{ fontSize: 8 }} interval={0} angle={-10} textAnchor="end" height={36} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="horas" fill="#4C7C74" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-slate-500 mt-2">Total: <b className="text-slate-700">{total.toFixed(1)} hrs</b></div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Horas por prestación (top 10)</div>
            <div className="bg-white rounded-xl border border-slate-200 p-3" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartTrazadoras} layout="vertical" margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="actividad" tick={{ fontSize: 9 }} width={130} interval={0} />
                  <Tooltip />
                  <Bar dataKey="horas" fill="#7A5CC7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Indicadores</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="text-[11px] text-slate-500">%CNE</div>
                {puedeEditar ? (
                  <input
                    type="number" min={0} max={100} step={0.1}
                    value={agenda.cnePct}
                    onChange={(e) => onAction('editar_cne', agenda, { valor: Number(e.target.value) })}
                    className={`text-lg font-semibold mt-0.5 w-full bg-transparent focus:outline-none ${agenda.cnePct > 15 ? 'text-[#B6522F]' : 'text-slate-800'}`}
                  />
                ) : (
                  <div className={`text-lg font-semibold mt-0.5 ${agenda.cnePct > 15 ? 'text-[#B6522F]' : 'text-slate-800'}`}>{agenda.cnePct}%</div>
                )}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="text-[11px] text-slate-500">Rendimiento</div>
                <div className="text-lg font-semibold mt-0.5 text-slate-800">{rendimiento} <span className="text-[11px] font-normal text-slate-400">at/hr</span></div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 col-span-2">
                <div className="text-[11px] text-slate-500">Proyección de producción anual</div>
                <div className="text-lg font-semibold mt-0.5 text-slate-800">{produccionAnual.toLocaleString('es-CL')} <span className="text-[11px] font-normal text-slate-400">atenciones/año</span></div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">Rendimiento = atenciones realizadas ({agenda.atenciones}) / horas totales programadas ({total.toFixed(1)}). Proyección anual = cupos semanales × {SEMANAS_POR_ANIO} semanas, descontando {AUSENTISMO_PCT}% de ausentismo.</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resumen estandarizado (IA)</div>
              {!agenda.resumenIA && (
                <button
                  onClick={() => onGenerarResumen(agenda)}
                  disabled={resumenLoading}
                  className="text-xs flex items-center gap-1 text-[#4C7C74] font-medium hover:underline disabled:opacity-50"
                >
                  {resumenLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generar
                </button>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-sm text-slate-700 min-h-[60px]">
              {agenda.resumenIA || <span className="text-slate-400 italic text-xs">Aún no generado.</span>}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Historial de versiones</div>
            <div className="space-y-2">
              {agenda.historial.slice().reverse().map((h, i) => (
                <div key={i} className="flex gap-2.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                  <div>
                    <div className="text-slate-700"><b>{h.accion}</b> — {h.usuario}</div>
                    <div className="text-slate-400">{h.fecha}{h.comentario ? ` · ${h.comentario}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Programación (reemplaza el Excel)</div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                {agenda.profesionales.length} profesional{agenda.profesionales.length === 1 ? '' : 'es'} · {agenda.bloquesProf.length} actividades cargadas
                {(() => {
                  const n = detectarTopes(agenda.bloquesProf).size;
                  return n > 0 ? (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#9B2C2C] bg-[#FDECEC] px-1.5 py-0.5 rounded-full align-middle">
                      <AlertTriangle size={10} /> {n} bloques superpuestos
                    </span>
                  ) : null;
                })()}
              </div>
              <button onClick={onAbrirEditor} className="text-xs font-medium text-[#4C7C74] hover:underline">
                {puedeEditar ? 'Abrir editor' : 'Ver programación'}
              </button>
            </div>
          </div>
          {puedeEditar && (
            <label className="text-xs text-slate-600 font-medium block">
              Atenciones realizadas
              <input
                type="number" min={0}
                value={agenda.atenciones}
                onChange={(e) => onAction('editar_atenciones', agenda, { valor: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4C7C74]/40"
              />
            </label>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3.5 flex flex-wrap gap-2">
          {role === 'jefe_servicio' && agenda.estado === 'borrador' && (
            <button onClick={() => onAction('enviar', agenda)} style={{ background: '#4C7C74' }} className="flex items-center gap-1.5 text-white text-sm font-medium px-3.5 py-2 rounded-lg">
              <Send size={14} /> Enviar a Referente
            </button>
          )}
          {role === 'jefe_servicio' && agenda.estado === 'rechazada' && (
            <button onClick={() => onAction('reenviar', agenda)} style={{ background: '#4C7C74' }} className="flex items-center gap-1.5 text-white text-sm font-medium px-3.5 py-2 rounded-lg">
              <Send size={14} /> Editar y reenviar
            </button>
          )}
          {role === 'referente_programacion' && agenda.estado === 'enviada' && (
            <>
              <button onClick={() => onAction('aprobar', agenda)} style={{ background: '#4C7C74' }} className="flex items-center gap-1.5 text-white text-sm font-medium px-3 py-2 rounded-lg">
                <CheckCircle2 size={14} /> Aprobar
              </button>
              <button onClick={() => onAction('rechazar', agenda)} style={{ borderColor: '#B6522F', color: '#B6522F' }} className="flex items-center gap-1.5 bg-white border text-sm font-medium px-3 py-2 rounded-lg">
                <XCircle size={14} /> Rechazar
              </button>
              <button onClick={() => onAction('escalar', agenda)} style={{ borderColor: '#7A5CC7', color: '#7A5CC7' }} className="flex items-center gap-1.5 bg-white border text-sm font-medium px-3 py-2 rounded-lg">
                <ArrowUpCircle size={14} /> Escalar a Subdirección
              </button>
            </>
          )}
          {role === 'subdirector' && agenda.estado === 'escalada' && (
            <>
              <button onClick={() => onAction('aprobar', agenda)} style={{ background: '#4C7C74' }} className="flex items-center gap-1.5 text-white text-sm font-medium px-3 py-2 rounded-lg">
                <CheckCircle2 size={14} /> Aprobar
              </button>
              <button onClick={() => onAction('rechazar', agenda)} style={{ borderColor: '#B6522F', color: '#B6522F' }} className="flex items-center gap-1.5 bg-white border text-sm font-medium px-3 py-2 rounded-lg">
                <XCircle size={14} /> Rechazar
              </button>
            </>
          )}
          {role === 'admision' && agenda.estado === 'aprobada' && (
            <button onClick={() => onAction('subir_alma', agenda)} style={{ background: '#1E2E33' }} className="flex items-center gap-1.5 text-white text-sm font-medium px-3.5 py-2 rounded-lg">
              <UploadCloud size={14} /> Marcar subida a ALMA
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatoFechaCorta(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function NuevaAgendaModal({ servicio, jefeNombre, agendaBase, onClose, onCreate }) {
  const [vigenciaDesde, setVigenciaDesde] = useState('');
  const [vigenciaHasta, setVigenciaHasta] = useState('');
  const [usarBase, setUsarBase] = useState(!!agendaBase);
  const [creando, setCreando] = useState(false);
  const clonBaseRef = useRef(agendaBase ? clonarProfesionalesYBloques(agendaBase) : null);

  function toggleUsarBase(checked) {
    setUsarBase(checked);
  }

  async function handleCrear() {
    const profesionales = usarBase && clonBaseRef.current ? clonBaseRef.current.profesionales : [];
    const bloques = usarBase && clonBaseRef.current ? clonBaseRef.current.bloques : [];
    const vigenciaLabel = vigenciaDesde && vigenciaHasta
      ? `${formatoFechaCorta(vigenciaDesde)} – ${formatoFechaCorta(vigenciaHasta)}`
      : (vigenciaDesde ? `Desde ${formatoFechaCorta(vigenciaDesde)}` : 'Vigencia sin definir');
    setCreando(true);
    try {
      await onCreate(servicio, jefeNombre, horasDesdeBloquesProf(bloques), vigenciaLabel, null, null, distribucionDesdeBloquesProf(bloques), profesionales, bloques, vigenciaDesde, vigenciaHasta);
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(30,46,51,0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="font-semibold text-slate-800">Nueva agenda</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="space-y-3 px-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="text-xs text-slate-600 font-medium block">
              Servicio
              <div className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-sm text-slate-500">{servicio}</div>
            </div>
            <div className="text-xs text-slate-600 font-medium block">
              Jefe de Servicio
              <div className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-sm text-slate-500">{jefeNombre} <span className="text-[10px] text-slate-400">(tu sesión)</span></div>
            </div>
          </div>
          <div className="text-xs text-slate-600 font-medium block">Vigencia de la agenda</div>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="text-xs text-slate-500 block">
              Desde
              <input type="date" value={vigenciaDesde} onChange={(e) => setVigenciaDesde(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4C7C74]/40" />
            </label>
            <label className="text-xs text-slate-500 block">
              Hasta
              <input type="date" value={vigenciaHasta} onChange={(e) => setVigenciaHasta(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4C7C74]/40" />
            </label>
          </div>

          {agendaBase ? (
            <label className="flex items-start gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-2.5 cursor-pointer">
              <input type="checkbox" checked={usarBase} onChange={(e) => toggleUsarBase(e.target.checked)} className="mt-0.5" />
              <span>
                Comenzar desde la última versión ({agendaBase.mes}, v{agendaBase.version}) — {agendaBase.profesionales.length} profesional{agendaBase.profesionales.length === 1 ? '' : 'es'} y {agendaBase.bloquesProf.length} actividades ya cargadas, listas para ajustar.
              </span>
            </label>
          ) : (
            <div className="text-[11px] text-slate-400 italic">No hay una versión anterior de este servicio; la programación partirá en blanco.</div>
          )}

          <div className="text-[11px] text-slate-400 pb-1">El %CNE y las atenciones se completan más adelante, dentro del editor de programación. Al crear la agenda se abrirá directamente para ingresar o ajustar la agenda de cada especialista.</div>
        </div>
        <div className="px-5 py-4 shrink-0 border-t border-slate-100">
          <button
            disabled={!vigenciaDesde || creando}
            onClick={handleCrear}
            style={{ background: '#4C7C74' }}
            className="w-full flex items-center justify-center gap-1.5 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-60"
          >
            {creando && <Loader2 size={14} className="animate-spin" />}
            {creando ? 'Creando...' : 'Crear agenda'}
          </button>
          {creando && usarBase && (
            <div className="text-[10px] text-slate-400 text-center mt-1.5">
              Copiando {clonBaseRef.current?.bloques.length || 0} actividades de la versión anterior, puede tardar unos segundos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatIA() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hola, puedo responder consultas sobre el proceso de programación de agendas usando los documentos normativos cargados. ¿Qué necesitas saber?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    const context = DOCS_NORMATIVOS.map((d) => `- ${d.titulo}: ${d.resumen}`).join('\n');
    const system = `Eres un asistente institucional para el Departamento de Desarrollo Institucional (DDI) de un hospital chileno. Responde SOLO en base a los siguientes documentos normativos del proceso de programación de agendas. Sé breve, claro y en español. Si la pregunta no se puede responder con estos documentos, dilo honestamente.\n\nDocumentos:\n${context}`;

    const reply = await callClaude([{ role: 'user', content: userMsg }], system);
    setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'bg-[#4C7C74] text-white ml-auto' : 'bg-white border border-slate-200 text-slate-700'}`}>
            {m.text}
          </div>
        ))}
        {loading && <div className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Pensando…</div>}
        <div ref={endRef} />
      </div>
      <div className="p-3 border-t border-slate-200 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ej: ¿cuándo debo escalar una agenda a Subdirección?"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4C7C74]/40"
        />
        <button onClick={send} className="bg-[#4C7C74] text-white px-3.5 rounded-lg hover:opacity-90"><Send size={16} /></button>
      </div>
    </div>
  );
}

function DocsTab() {
  return (
    <div className="p-5 space-y-3 overflow-y-auto h-full">
      {DOCS_NORMATIVOS.map((d, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-2.5">
            <FileText size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium text-sm text-slate-800">{d.titulo}</div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">{d.resumen}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Dropdown con checkboxes para elegir varios servicios a la vez (en vez de un <select> de una
// sola opción) — se usa en el resumen general para poder combinar, por ejemplo, todas las
// subespecialidades de un jefe que tiene más de un servicio a cargo.
// Selector múltiple genérico (servicios por defecto; también tipos de profesional, etc.).
function FiltroMultiServicio({ servicios, seleccionados, onCambiar, textoTodos = 'Todos los servicios', plural = 'servicios' }) {
  const [abierto, setAbierto] = useState(false);
  const [buscar, setBuscar] = useState('');
  const ref = useRef(null);
  const conBuscador = servicios.length > 12;
  const visibles = buscar.trim() ? servicios.filter((s) => claveActividad(s).includes(claveActividad(buscar))) : servicios;
  useEffect(() => {
    function onClickFuera(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener('mousedown', onClickFuera);
    return () => document.removeEventListener('mousedown', onClickFuera);
  }, []);
  const etiqueta =
    seleccionados.length === 0
      ? textoTodos
      : seleccionados.length === 1
        ? seleccionados[0]
        : `${seleccionados.length} ${plural} seleccionados`;
  function toggle(s) {
    onCambiar(seleccionados.includes(s) ? seleccionados.filter((x) => x !== s) : [...seleccionados, s]);
  }
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white flex items-center gap-1.5 max-w-[220px]"
      >
        <span className="truncate">{etiqueta}</span>
        <ChevronDown size={12} className="shrink-0 text-slate-400" />
      </button>
      {abierto && (
        <div className="absolute z-20 mt-1 w-64 max-h-72 overflow-y-auto bg-white rounded-lg border border-slate-200 shadow-lg p-1.5">
          <div className="flex items-center justify-between px-1.5 py-1 border-b border-slate-100 mb-1">
            <button onClick={() => onCambiar([])} className="text-[11px] text-[#4C7C74] hover:underline">Todos</button>
            {seleccionados.length > 0 && (
              <span className="text-[11px] text-slate-400">{seleccionados.length} seleccionado{seleccionados.length === 1 ? '' : 's'}</span>
            )}
          </div>
          {conBuscador && (
            <input
              autoFocus
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar..."
              className="w-full text-xs rounded border border-slate-200 px-2 py-1 mb-1 focus:outline-none focus:border-[#4C7C74]"
            />
          )}
          {visibles.length === 0 && <div className="px-1.5 py-1 text-[11px] text-slate-400 italic">Sin coincidencias</div>}
          {visibles.map((s) => (
            <label key={s} className="flex items-center gap-2 px-1.5 py-1 text-xs text-slate-700 hover:bg-slate-50 rounded cursor-pointer">
              <input type="checkbox" checked={seleccionados.includes(s)} onChange={() => toggle(s)} />
              <span className="truncate">{s}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function ResumenDashboardTab({ agendas, periodo, periodos = [] }) {
  const [filtrosServicio, setFiltrosServicio] = useState([]); // [] = todos los servicios visibles
  const [descargandoMinisterial, setDescargandoMinisterial] = useState(false);
  const [errorMinisterial, setErrorMinisterial] = useState('');
  // Periodo a procesar en el resumen ministerial: parte en el periodo activo (por defecto el
  // próximo año, ej. 2027), pero se puede elegir otro sin cambiar todo el tablero.
  const [periodoMinisterial, setPeriodoMinisterial] = useState(periodo);
  useEffect(() => { setPeriodoMinisterial(periodo); }, [periodo]);
  async function descargarMinisterial() {
    setDescargandoMinisterial(true);
    setErrorMinisterial('');
    try {
      await downloadResumenMinisterial({ periodo: periodoMinisterial, servicios: filtrosServicio });
    } catch (e) {
      setErrorMinisterial('No se pudo generar el resumen. Intenta de nuevo.');
    } finally {
      setDescargandoMinisterial(false);
    }
  }
  const [filtroMes, setFiltroMes] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroBecados, setFiltroBecados] = useState('todos'); // 'todos' | 'sin' | 'solo'
  const [filtroTiposProfesional, setFiltroTiposProfesional] = useState([]); // [] = todos los tipos
  const [filtroProcesos, setFiltroProcesos] = useState([]); // [] = todos los procesos
  const [filtroProfesional, setFiltroProfesional] = useState('todos');
  const [seleccion, setSeleccion] = useState([]); // [{ proceso, actividad }] — se pueden combinar varias prestaciones
  const [seleccionProfMapa, setSeleccionProfMapa] = useState([]); // claves de profesionales para armar el mapa de calor
  const [capacidadPabellon, setCapacidadPabellon] = useState(null); // { cargado, grid } | null

  // La capacidad de pabellón es un concepto por servicio, así que solo se consulta cuando el
  // filtro está acotado a UN servicio específico (no tiene sentido sumarla entre especialidades
  // distintas que usan pabellones físicamente distintos).
  useEffect(() => {
    let cancelado = false;
    if (filtrosServicio.length !== 1) { setCapacidadPabellon(null); return; }
    fetchPabellonCapacidad(filtrosServicio[0])
      .then((data) => { if (!cancelado) setCapacidadPabellon(data); })
      .catch(() => { if (!cancelado) setCapacidadPabellon(null); });
    return () => { cancelado = true; };
  }, [filtrosServicio]);

  const servicios = useMemo(() => Array.from(new Set(agendas.map((a) => a.servicio))).sort(), [agendas]);
  const meses = useMemo(() => Array.from(new Set(agendas.map((a) => a.mes))).sort(), [agendas]);

  const filtradas = useMemo(
    () =>
      agendas.filter(
        (a) =>
          (filtrosServicio.length === 0 || filtrosServicio.includes(a.servicio)) &&
          (filtroMes === 'todos' || a.mes === filtroMes) &&
          (filtroEstado === 'todos' || a.estado === filtroEstado)
      ),
    [agendas, filtrosServicio, filtroMes, filtroEstado]
  );

  const hayBecados = useMemo(() => filtradas.some((a) => a.profesionales.some((p) => p.nivelFormacion)), [filtradas]);

  // %CNE y atenciones se registran por agenda completa (no por profesional), así que estos dos
  // indicadores siempre reflejan el total de las agendas filtradas, sin importar el filtro de becados.
  const totalHorasAgendaCompleta = filtradas.reduce((sum, a) => sum + totalHorasAgenda(a.horas), 0);
  const totalAtenciones = filtradas.reduce((sum, a) => sum + (a.atenciones || 0), 0);
  const rendimientoProm = totalHorasAgendaCompleta ? (totalAtenciones / totalHorasAgendaCompleta).toFixed(2) : '0.00';
  const cnePctGlobal = useMemo(() => {
    const pesoTotal = filtradas.reduce((sum, a) => sum + totalHorasAgenda(a.horas), 0);
    if (!pesoTotal) return '0.0';
    const ponderado = filtradas.reduce((sum, a) => sum + a.cnePct * totalHorasAgenda(a.horas), 0);
    return (ponderado / pesoTotal).toFixed(1);
  }, [filtradas]);

  // Cada bloque se etiqueta con la agenda de origen para no confundir profesionales con el mismo id
  // entre distintas agendas al filtrar por becados.
  const todosBloquesCompleto = useMemo(
    () => filtradas.flatMap((a) => a.bloquesProf.map((b) => ({ ...b, __agendaId: a.id, __servicio: a.servicio }))),
    [filtradas]
  );
  const becadoKeys = useMemo(() => {
    const set = new Set();
    filtradas.forEach((a) => {
      a.profesionales.forEach((p) => {
        if (p.nivelFormacion) set.add(`${a.id}|||${p.id}`);
      });
    });
    return set;
  }, [filtradas]);
  const tipoPorProfesional = useMemo(() => {
    const map = new Map();
    filtradas.forEach((a) => {
      a.profesionales.forEach((p) => {
        map.set(`${a.id}|||${p.id}`, p.tipo || 'Sin tipo');
      });
    });
    return map;
  }, [filtradas]);
  const tiposProfesional = useMemo(
    () => Array.from(new Set(tipoPorProfesional.values())).sort(),
    [tipoPorProfesional]
  );
  const profesionalesOpciones = useMemo(() => {
    const list = [];
    filtradas.forEach((a) => {
      a.profesionales.forEach((p) => {
        list.push({ key: `${a.id}|||${p.id}`, nombre: p.nombre, servicio: a.servicio });
      });
    });
    return list.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [filtradas]);
  const todosBloques = useMemo(() => {
    return todosBloquesCompleto.filter((b) => {
      const key = `${b.__agendaId}|||${b.profesionalId}`;
      if (filtroBecados !== 'todos') {
        const esBecado = becadoKeys.has(key);
        if (filtroBecados === 'solo' ? !esBecado : esBecado) return false;
      }
      if (filtroTiposProfesional.length > 0 && !filtroTiposProfesional.includes(tipoPorProfesional.get(key))) return false;
      if (filtroProfesional !== 'todos' && key !== filtroProfesional) return false;
      if (filtroProcesos.length > 0 && !filtroProcesos.includes(b.proceso)) return false;
      return true;
    });
  }, [todosBloquesCompleto, becadoKeys, filtroBecados, tipoPorProfesional, filtroTiposProfesional, filtroProfesional, filtroProcesos]);
  // Procesos presentes en las agendas filtradas: primero los 4 clínicos en su orden habitual,
  // luego los propios de otras profesiones (ej. A. Social, HD). Los turnos no tienen proceso.
  const procesosOpciones = useMemo(() => {
    const presentes = new Set(todosBloquesCompleto.map((b) => b.proceso).filter(Boolean));
    return [...PROCESOS_CAT.filter((p) => presentes.has(p)), ...[...presentes].filter((p) => !PROCESOS_CAT.includes(p)).sort()];
  }, [todosBloquesCompleto]);

  const totalHoras = useMemo(() => todosBloques.filter((b) => !b.esTurno).reduce((s, b) => s + b.duracionMin / 60, 0), [todosBloques]);

  const porServicio = useMemo(() => {
    const map = {};
    todosBloques.filter((b) => !b.esTurno).forEach((b) => {
      map[b.__servicio] = (map[b.__servicio] || 0) + b.duracionMin / 60;
    });
    return Object.entries(map).map(([servicio, horas]) => ({ servicio, horas: Math.round(horas * 10) / 10 }));
  }, [todosBloques]);

  const porProceso = useMemo(() => {
    const horasPorProceso = horasDesdeBloquesProf(todosBloques);
    return PROCESOS_CAT.map((p) => ({ proceso: p, horas: horasPorProceso[p] || 0 }));
  }, [todosBloques]);

  const porTrazadora = useMemo(() => horasPorActividadYProceso(todosBloques), [todosBloques]);

  const bloquesPorPrestacion = useMemo(
    () => (seleccion.length > 0 ? todosBloques.filter((b) => seleccion.some((s) => s.clave === claveActividad(b.actividad))) : todosBloques),
    [todosBloques, seleccion]
  );
  const claveProfMapa = (b) => `${b.__agendaId}|||${b.profesionalId}`;
  const horasProfMapa = useMemo(() => horasPorClaveProfesional(bloquesPorPrestacion, claveProfMapa), [bloquesPorPrestacion]);
  const opcionesProfMapa = useMemo(
    () => profesionalesOpciones
      .filter((p) => horasProfMapa.has(p.key) || seleccionProfMapa.includes(p.key))
      .map((p) => ({ key: p.key, nombre: p.nombre, detalle: p.servicio })),
    [profesionalesOpciones, horasProfMapa, seleccionProfMapa]
  );
  const bloquesDistribucion = useMemo(
    () => (seleccionProfMapa.length > 0 ? bloquesPorPrestacion.filter((b) => seleccionProfMapa.includes(claveProfMapa(b))) : bloquesPorPrestacion),
    [bloquesPorPrestacion, seleccionProfMapa]
  );
  const distribucionAgregada = useMemo(() => distribucionDesdeBloquesProf(bloquesDistribucion), [bloquesDistribucion]);
  const paralelosPorBloque = useMemo(() => paralelosDesdeBloquesProf(bloquesDistribucion), [bloquesDistribucion]);
  const esPabellonSeleccionado = seleccion.length > 0 && seleccion.every((s) => /pabellon/i.test(s.actividad || ''));
  const usarCapacidadRealPabellon = esPabellonSeleccionado && filtrosServicio.length === 1 && capacidadPabellon?.cargado;

  const cuposNuevas = useMemo(() => todosBloques.filter((b) => esConsultaNueva(b.actividad)).reduce((s, b) => s + cuposBloque(b), 0), [todosBloques]);
  const cuposControles = useMemo(() => todosBloques.filter((b) => esConsultaControl(b.actividad)).reduce((s, b) => s + cuposBloque(b), 0), [todosBloques]);
  const pctConsultaNueva = cuposNuevas + cuposControles > 0 ? Math.round((cuposNuevas / (cuposNuevas + cuposControles)) * 100) : null;

  const rendimientoPrestaciones = useMemo(() => rendimientoPorPrestacion(todosBloques), [todosBloques]);

  return (
    <div className="p-5 h-full overflow-y-auto space-y-5">
      <div className="flex flex-wrap gap-2">
        <FiltroMultiServicio servicios={servicios} seleccionados={filtrosServicio} onCambiar={setFiltrosServicio} />
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white">
          <option value="todos">Todos los meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white">
          <option value="todos">Todos los estados</option>
          {COLUMN_ORDER.map((e2) => (
            <option key={e2} value={e2}>{ESTADOS[e2].label}</option>
          ))}
        </select>
        <FiltroMultiServicio
          servicios={tiposProfesional}
          seleccionados={filtroTiposProfesional.filter((t) => tiposProfesional.includes(t))}
          onCambiar={setFiltroTiposProfesional}
          textoTodos="Todos los tipos de profesional"
          plural="tipos"
        />
        <FiltroMultiServicio
          servicios={procesosOpciones}
          seleccionados={filtroProcesos.filter((p) => procesosOpciones.includes(p))}
          onCambiar={setFiltroProcesos}
          textoTodos="Todos los procesos"
          plural="procesos"
        />
        <select value={filtroProfesional} onChange={(e) => setFiltroProfesional(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white">
          <option value="todos">Todos los profesionales</option>
          {profesionalesOpciones.map((p) => (
            <option key={p.key} value={p.key}>{p.nombre} — {p.servicio}</option>
          ))}
        </select>
        {(filtrosServicio.length > 0 || filtroMes !== 'todos' || filtroEstado !== 'todos' || filtroTiposProfesional.length > 0 || filtroProcesos.length > 0 || filtroProfesional !== 'todos') && (
          <button
            onClick={() => { setFiltrosServicio([]); setFiltroMes('todos'); setFiltroEstado('todos'); setFiltroTiposProfesional([]); setFiltroProcesos([]); setFiltroProfesional('todos'); }}
            className="text-xs text-slate-400 hover:text-slate-600 underline px-1"
          >
            Limpiar filtros
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {errorMinisterial && <span className="text-[11px] text-[#DC2626]">{errorMinisterial}</span>}
          <div className="inline-flex items-stretch rounded-lg border border-[#4C7C74] overflow-hidden">
            <select
              value={periodoMinisterial}
              onChange={(e) => setPeriodoMinisterial(Number(e.target.value))}
              title="Periodo de programación a procesar"
              className="text-xs bg-[#EBF5F2] text-[#2F6C5D] font-medium px-1.5 border-r border-[#4C7C74] focus:outline-none"
            >
              {[...new Set([periodo, ...periodos])].sort((a, b) => b - a).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button
              onClick={descargarMinisterial}
              disabled={descargandoMinisterial}
              title={`Procesa la programación ${periodoMinisterial} (${filtrosServicio.length ? `${filtrosServicio.length} servicio(s) filtrado(s)` : 'todos los servicios'}) y descarga el Excel ministerial: Médicos, Profesionales no médicos y Odontólogos.`}
              className="text-xs text-[#2F6C5D] bg-white hover:bg-[#EBF5F2] px-2.5 py-1.5 flex items-center gap-1.5 disabled:opacity-60"
            >
              {descargandoMinisterial ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {descargandoMinisterial ? 'Procesando…' : `Procesar resumen ministerial ${periodoMinisterial}`}
            </button>
          </div>
        </div>
      </div>

      {hayBecados && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Profesionales:</span>
          {[
            { value: 'todos', label: 'Todos' },
            { value: 'sin', label: 'Sin becados' },
            { value: 'solo', label: 'Solo becados' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFiltroBecados(opt.value)}
              className={`text-xs px-2.5 py-1 rounded-full border ${filtroBecados === opt.value ? 'bg-[#4C7C74] text-white border-[#4C7C74]' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Agendas</div>
          <div className="text-2xl font-semibold text-slate-800 mt-1">{filtradas.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Horas programadas</div>
          <div className="text-2xl font-semibold text-slate-800 mt-1">{totalHoras.toFixed(1)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">%CNE global</div>
          <div className="text-2xl font-semibold mt-1" style={{ color: cnePctGlobal > 15 ? '#B6522F' : '#1E2E33' }}>{cnePctGlobal}%</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Rendimiento prom.</div>
          <div className="text-2xl font-semibold text-slate-800 mt-1">{rendimientoProm} <span className="text-xs font-normal text-slate-400">at/hr</span></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">% Consulta Nueva</div>
          <div className="text-2xl font-semibold text-slate-800 mt-1">{pctConsultaNueva === null ? '—' : `${pctConsultaNueva}%`}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{cuposNuevas} nuevas / {cuposControles} controles</div>
        </div>
      </div>
      {hayBecados && (
        <div className="text-[11px] text-slate-400 -mt-3">%CNE global y Rendimiento prom. siempre son del total de agendas filtradas (se registran por agenda, no por profesional), sin importar el filtro de becados.</div>
      )}

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Horas por servicio</div>
        <div className="bg-white rounded-xl border border-slate-200 p-3" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porServicio} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="servicio" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="horas" fill="#3B6FA0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Horas por proceso</div>
        <div className="bg-white rounded-xl border border-slate-200 p-3" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porProceso} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="proceso" tick={{ fontSize: 9 }} interval={0} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => [`${value.toFixed(1)} hrs`, 'Horas']} />
              <Bar dataKey="horas" fill="#4C7C74" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="horas"
                  position="top"
                  style={{ fontSize: 9, fill: '#475569' }}
                  formatter={(value) => (totalHoras > 0 ? `${Math.round((value / totalHoras) * 100)}%` : '')}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <GraficoHorasPorPrestacion datos={porTrazadora} seleccion={seleccion} setSeleccion={setSeleccion} />

      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Distribución horaria vs. infraestructura disponible{seleccion.length > 0 ? ` — ${seleccion.length === 1 ? `${seleccion[0].actividad} (${seleccion[0].proceso})` : `${seleccion.length} prestaciones seleccionadas`}` : ''}
          </div>
          <div className="flex items-center gap-2">
            {esPabellonSeleccionado && (
              usarCapacidadRealPabellon ? (
                <span className="text-[10px] font-semibold text-[#2F6C5D] bg-[#EBF5F2] px-2 py-0.5 rounded-full">Capacidad real de pabellón</span>
              ) : filtrosServicio.length !== 1 ? (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Filtra por un solo servicio para ver capacidad real</span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Sin planilla de pabellón cargada — capacidad estimada</span>
              )
            )}
          </div>
        </div>
        <SelectorProfesionalesMapa opciones={opcionesProfMapa} horasPorKey={horasProfMapa} seleccion={seleccionProfMapa} setSeleccion={setSeleccionProfMapa} />
        <div className={usarCapacidadRealPabellon ? 'flex flex-wrap gap-6 items-start' : ''}>
          <div>
            {usarCapacidadRealPabellon && <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Programado</div>}
            <div className="bg-white rounded-xl border border-slate-200 p-3 overflow-x-auto">
              <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${DIAS.length}, 34px)`, gap: 3, width: 'max-content' }}>
                <div />
                {DIAS.map((dia) => (
                  <div key={dia} className="text-[10px] text-slate-600 font-medium text-center">{dia.slice(0, 3)}</div>
                ))}
                {BLOQUES.map((b) => (
                  <React.Fragment key={b}>
                    <div className="text-[8px] text-slate-400 flex items-center justify-end pr-1">{b.slice(3, 5) === '00' ? b.slice(0, 2) : ''}</div>
                    {DIAS.map((dia) => {
                      const horasProgramadas = distribucionAgregada[dia][b];
                      const pabellonesAsignados = usarCapacidadRealPabellon ? (capacidadPabellon.grid[dia]?.[b] ?? 0) : null;
                      const capacidad = usarCapacidadRealPabellon ? pabellonesAsignados * 0.5 : INFRAESTRUCTURA_CAPACIDAD[dia][b];
                      const pct = capacidad > 0 ? (horasProgramadas / capacidad) * 100 : (horasProgramadas > 0 ? 999 : 0);
                      const color = heatColor(pct);
                      const paralelos = paralelosPorBloque[dia][b];
                      const detalleCapacidad = usarCapacidadRealPabellon
                        ? `${pabellonesAsignados} pabellón${pabellonesAsignados === 1 ? '' : 'es'} asignado${pabellonesAsignados === 1 ? '' : 's'}`
                        : `${capacidad} hrs (estimado)`;
                      return (
                        <div
                          key={dia}
                          title={`${dia} ${b} — ${horasProgramadas.toFixed(1)} hrs programadas / ${detalleCapacidad} (${capacidad > 0 ? pct.toFixed(0) + '%' : 'sin capacidad'}) · ${paralelos} profesional${paralelos === 1 ? '' : 'es'} en paralelo`}
                          style={{ background: color.bg, height: 16, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {paralelos > 0 && (
                            <span style={{ color: color.text, fontSize: 9, fontWeight: 600 }}>{paralelos}</span>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 px-1 max-w-xs">
                <span className="text-[10px] text-slate-400">0%</span>
                <div className="flex-1 h-2.5 rounded-full" style={{ background: 'linear-gradient(to right, hsl(165,62%,88%), hsl(82,62%,64%), hsl(41,62%,52%), hsl(0,62%,40%))' }} />
                <span className="text-[10px] text-slate-400">≥130%</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">Color = % de uso respecto a la capacidad de infraestructura (boxes/pabellones) disponible por día y bloque de 30 min. El número en cada celda es la cantidad de profesionales en paralelo. Pasa el mouse sobre una celda para ver el detalle. La capacidad es una referencia ajustable, no un dato real de infraestructura.</div>
          </div>
          {usarCapacidadRealPabellon && <CapacidadPabellonHeatmap grid={capacidadPabellon.grid} />}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Rendimiento por prestación</div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Prestación</th>
                <th className="text-left px-3 py-2 font-medium">Proceso</th>
                <th className="text-right px-3 py-2 font-medium">Horas</th>
                <th className="text-right px-3 py-2 font-medium">Cupos</th>
                <th className="text-right px-3 py-2 font-medium">Rendimiento (at/hr)</th>
              </tr>
            </thead>
            <tbody>
              {rendimientoPrestaciones.map((r) => (
                <tr key={`${r.proceso}|||${r.actividad}`} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-slate-700">{r.actividad}</td>
                  <td className="px-3 py-1.5" style={{ color: COLOR_PROCESO[r.proceso] }}>{r.proceso}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">{r.horas.toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">{r.cupos}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600 font-medium">{r.rendimiento.toFixed(2)}</td>
                </tr>
              ))}
              {rendimientoPrestaciones.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400 italic">Sin prestaciones con rendimiento para este filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-[11px] text-slate-400 mt-1.5">Solo incluye prestaciones que llevan cupos/rendimiento. Rendimiento = cupos totales ÷ horas totales de esa prestación, sumando todas las agendas filtradas.</div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Detalle</div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Servicio</th>
                <th className="text-left px-3 py-2 font-medium">Mes</th>
                <th className="text-left px-3 py-2 font-medium">Estado</th>
                <th className="text-right px-3 py-2 font-medium">Horas</th>
                <th className="text-right px-3 py-2 font-medium">%CNE</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{a.servicio}</td>
                  <td className="px-3 py-2 text-slate-500">{a.mes}</td>
                  <td className="px-3 py-2"><div className="flex items-center gap-1.5 flex-wrap"><Badge estado={a.estado} /><BadgeCopia agenda={a} /></div></td>
                  <td className="px-3 py-2 text-right text-slate-700 font-medium">{totalHorasAgenda(a.horas).toFixed(1)}</td>
                  <td className="px-3 py-2 text-right text-slate-700 font-medium">{a.cnePct}%</td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400 italic">Sin agendas para este filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   App principal
--------------------------------------------------------- */

function HistorialAgendasTab({ agendas, onAbrir }) {
  const [filtroServicio, setFiltroServicio] = useState('todos');
  const servicios = useMemo(() => Array.from(new Set(agendas.map((a) => a.servicio))).sort(), [agendas]);

  const filtradas = useMemo(() => {
    return agendas
      .filter((a) => filtroServicio === 'todos' || a.servicio === filtroServicio)
      .slice()
      .sort((a, b) => {
        if (a.vigenciaDesde && b.vigenciaDesde) return a.vigenciaDesde.localeCompare(b.vigenciaDesde);
        return a.id - b.id;
      });
  }, [agendas, filtroServicio]);

  return (
    <div className="p-5 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="text-sm font-semibold text-slate-700">Historial de agendas</div>
        <select value={filtroServicio} onChange={(e) => setFiltroServicio(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white">
          <option value="todos">Todos los servicios</option>
          {servicios.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="text-[11px] text-slate-400 mb-4">En orden cronológico según su vigencia — así se ve cómo fue cambiando la planificación mes a mes, no los cambios internos de una sola agenda.</div>

      {filtradas.length === 0 && (
        <div className="text-sm text-slate-400 italic text-center py-10 border border-dashed border-slate-300 rounded-xl">Aún no hay agendas confirmadas para mostrar.</div>
      )}

      <div>
        {filtradas.map((a, idx) => {
          const totalHrs = totalHorasAgenda(a.horas);
          return (
            <button
              key={a.id}
              onClick={() => onAbrir(a)}
              className="w-full text-left flex gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-slate-50/70"
            >
              <div className="flex flex-col items-center pt-1 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: ESTADOS[a.estado].color }} />
                {idx < filtradas.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-sm font-semibold text-slate-800">{a.servicio} <span className="text-xs font-normal text-slate-400">· v{a.version} · #{a.id}</span></div>
                  <div className="flex items-center gap-1.5"><BadgeCopia agenda={a} /><Badge estado={a.estado} /></div>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{a.mes} · {a.jefe} · {totalHrs.toFixed(1)} hrs · {a.profesionales.length} profesional{a.profesionales.length === 1 ? '' : 'es'}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UsuariosAdminTab({ users, services, onCreateUser }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo123');
  const [role, setRole] = useState('jefe_servicio');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!serviceId && services[0]?.id) {
      setServiceId(services[0].id);
    }
  }, [serviceId, services]);

  async function handleSubmit() {
    setLoading(true);
    setError('');
    setFeedback('');
    try {
      await onCreateUser({
        name,
        email,
        password,
        role,
        serviceId: role === 'jefe_servicio' ? serviceId : null,
      });
      setName('');
      setEmail('');
      setPassword('demo123');
      setFeedback('Usuario creado correctamente.');
    } catch (submitError) {
      setError(submitError.message || 'No fue posible crear el usuario.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full overflow-auto p-4 md:p-5">
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-800">Crear usuario</div>
          <div className="mt-1 text-xs text-slate-500">Sprint 1: alta manual de usuarios base para pruebas.</div>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-slate-600">
              Nombre
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Rol
              <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white">
                <option value="admin">Administrador</option>
                <option value="jefe_servicio">Jefe de Servicio</option>
                <option value="referente_programacion">Referente de Programación</option>
                <option value="admision">Admisión</option>
                <option value="subdirector">Subdirector Atención Ambulatoria</option>
              </select>
            </label>
            {role === 'jefe_servicio' && (
              <label className="block text-xs font-medium text-slate-600">
                Servicio
                <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white">
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </label>
            )}
            {error && <div className="rounded-xl bg-[#FBEEE8] px-3 py-2 text-xs text-[#B6522F]">{error}</div>}
            {feedback && <div className="rounded-xl bg-[#EBF5F2] px-3 py-2 text-xs text-[#2F6C5D]">{feedback}</div>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ background: '#4C7C74' }}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-semibold text-slate-800">Usuarios creados</div>
            <div className="text-xs text-slate-500 mt-1">{users.length} usuarios en la base local.</div>
          </div>
          <div className="divide-y divide-slate-100">
            {users.map((user) => (
              <div key={user.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-slate-600">{ROLES[user.role]?.label || user.role}</div>
                    <div className="text-[11px] text-slate-400">{user.serviceName || 'Sin servicio'}</div>
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-400 italic">No hay usuarios cargados.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Lineamiento: se programa a todos los profesionales y solo a ellos, así que la nómina muestra solo
// las plantas profesionales (técnicos, administrativos, auxiliares y directivos quedan fuera).
const HR_PLANTAS = ['TODAS', 'MEDICOS', 'PROFESIONALES', 'ODONTOLOGOS', 'FARMACEUTICOS'];
const HR_PLANTA_LABEL = { TODAS: 'Todos los profesionales', MEDICOS: 'Médicos', PROFESIONALES: 'Profesionales', ODONTOLOGOS: 'Odontólogos', FARMACEUTICOS: 'Farmacéuticos' };

// Cruza el reporte de RRHH (Dotación) contra lo ya programado en la app: horas contratadas
// (ley 19.664, sumadas entre TODOS los servicios donde aparece la persona) vs. horas
// programadas (bloques de jornada ya cargados). El cruce se hace por RUT cuando el profesional
// ya lo tiene guardado; si no, cae a coincidencia por nombre (marcada aparte, menos confiable).
function RecursosHumanosTab({ resumen, cargando, error, planta, onCambiarPlanta, onSubirPlanilla }) {
  const [subiendo, setSubiendo] = useState(false);
  const [subidaError, setSubidaError] = useState('');
  const [subidaOk, setSubidaOk] = useState('');
  const fileInputRef = useRef(null);

  async function manejarArchivo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSubiendo(true);
    setSubidaError('');
    setSubidaOk('');
    try {
      const result = await onSubirPlanilla(file);
      setSubidaOk(`Se importaron ${result.filasImportadas} filas (hoja "${result.hoja}").`);
    } catch (err) {
      setSubidaError(err.message || 'No se pudo importar el archivo.');
    } finally {
      setSubiendo(false);
    }
  }

  // Estado de programación: 'todos' | 'programado' | 'sin' | 'pendientes' | 'completo' | 'exceso'
  const [vista, setVista] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [filtroCargos, setFiltroCargos] = useState([]);
  const [filtroUnidades, setFiltroUnidades] = useState([]);
  const [filtroServicios, setFiltroServicios] = useState([]);
  const [filtroTurno, setFiltroTurno] = useState('todos'); // 'todos' | 'con' | 'sin'
  const todos = resumen?.items || [];
  const cargosDe = (i) => i.cargos || (i.cargo ? i.cargo.split(' / ') : []);
  const unidadesDe = (i) => i.unidades || (i.unidad ? i.unidad.split(' / ') : []);
  const opcionesCargo = useMemo(() => [...new Set(todos.flatMap(cargosDe))].sort(), [todos]);
  const opcionesUnidad = useMemo(() => [...new Set(todos.flatMap(unidadesDe))].sort(), [todos]);
  const opcionesServicio = useMemo(() => [...new Set(todos.flatMap((i) => i.servicios || []))].sort(), [todos]);
  const SIN_SERVICIO = '(Sin programar)';
  const cumpleEstado = (i, v) => {
    if (v === 'todos') return true;
    if (v === 'sin') return i.sinAgendar;
    if (v === 'programado') return !i.sinAgendar;
    if (v === 'pendientes') return !i.sinAgendar && i.horasPendientes > 0;
    if (v === 'completo') return !i.sinAgendar && i.horasPendientes === 0;
    if (v === 'exceso') return !i.sinAgendar && i.horasPendientes < 0;
    return true;
  };
  // Filtros distintos del estado: los indicadores de arriba se calculan sobre esto, así reflejan
  // el cargo/unidad/servicio elegido y cada tarjeta sigue sirviendo de filtro rápido de estado.
  const base = useMemo(() => {
    const q = claveActividad(busqueda);
    return todos.filter((i) =>
      (filtroCargos.length === 0 || cargosDe(i).some((c) => filtroCargos.includes(c))) &&
      (filtroUnidades.length === 0 || unidadesDe(i).some((u) => filtroUnidades.includes(u))) &&
      (filtroServicios.length === 0 || (i.sinAgendar ? filtroServicios.includes(SIN_SERVICIO) : (i.servicios || []).some((s) => filtroServicios.includes(s)))) &&
      (filtroTurno === 'todos' || (filtroTurno === 'con' ? i.tieneTurno : !i.tieneTurno)) &&
      (!q || claveActividad(`${i.nombre} ${i.rut} ${i.cargo || ''} ${i.unidad || ''} ${(i.correlativos || []).join(' ')}`).includes(q))
    );
  }, [todos, filtroCargos, filtroUnidades, filtroServicios, filtroTurno, busqueda]);
  const totalPendientes = base.filter((i) => cumpleEstado(i, vista)).reduce((s, i) => s + Math.max(0, i.horasPendientes), 0);
  const sinAgendar = base.filter((i) => i.sinAgendar).length;
  const conPendientes = base.filter((i) => cumpleEstado(i, 'pendientes')).length;
  const items = useMemo(() => base.filter((i) => cumpleEstado(i, vista)), [base, vista]);
  const hayFiltros = vista !== 'todos' || busqueda.trim() || filtroCargos.length || filtroUnidades.length || filtroServicios.length || filtroTurno !== 'todos';
  function limpiarFiltros() {
    setVista('todos'); setBusqueda(''); setFiltroCargos([]); setFiltroUnidades([]); setFiltroServicios([]); setFiltroTurno('todos');
  }
  async function exportarFiltrados() {
    const XLSX = await import('xlsx'); // carga diferida: solo se baja al exportar
    const filas = items.map((i) => ({
      Nombre: i.nombre, RUT: `${i.rut}-${i.dv}`, Correlativo: (i.correlativos || []).join(' / '),
      Planta: HR_PLANTA_LABEL[i.planta] || i.planta, Cargo: i.cargo || '', Unidad: i.unidad || '',
      Turno: i.tieneTurno ? 'Sí' : 'No', Estado: i.sinAgendar ? 'Sin programar' : 'Programado',
      'Servicio(s) programado(s)': (i.servicios || []).join(', '),
      'Horas contratadas': i.horasContratadas, 'Horas programadas': i.horasProgramadas, 'Horas pendientes': i.horasPendientes,
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dotación');
    XLSX.writeFile(wb, `Nomina_dotacion_${resumen?.periodo || ''}.xlsx`);
  }
  const verPlanta = planta === 'TODAS';

  return (
    <div className="h-full overflow-auto p-4 md:p-5 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">Planilla de RRHH (Dotación)</div>
            <div className="text-xs text-slate-500 mt-1">
              {resumen?.ultimaImportacion
                ? `Último corte cargado: ${new Date(resumen.ultimaImportacion).toLocaleString('es-CL')}`
                : 'Todavía no se ha cargado ninguna planilla.'}
            </div>
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={manejarArchivo} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={subiendo}
              style={{ background: '#4C7C74' }}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {subiendo ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              {subiendo ? 'Cargando...' : 'Cargar planilla RRHH'}
            </button>
          </div>
        </div>
        {subidaError && <div className="mt-3 rounded-xl bg-[#FBEEE8] px-3 py-2 text-xs text-[#B6522F]">{subidaError}</div>}
        {subidaOk && <div className="mt-3 rounded-xl bg-[#EBF5F2] px-3 py-2 text-xs text-[#2F6C5D]">{subidaOk}</div>}
        <div className="mt-3 text-[11px] text-slate-400">
          Cada carga reemplaza por completo los datos anteriores — sube la planilla más reciente cada corte (mensual), no un histórico.
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-slate-500">Planta:</span>
        {HR_PLANTAS.map((p) => (
          <button
            key={p}
            onClick={() => onCambiarPlanta(p)}
            className={`text-xs px-2.5 py-1 rounded-full border ${planta === p ? 'bg-[#4C7C74] text-white border-[#4C7C74]' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'}`}
          >
            {HR_PLANTA_LABEL[p] || p}
          </button>
        ))}
        <span className="text-[11px] text-slate-400 ml-1">Técnicos, administrativos y auxiliares no se programan y no se incluyen.</span>
      </div>

      {error && <div className="rounded-xl bg-[#FBEEE8] px-3 py-2 text-xs text-[#B6522F]">{error}</div>}

      {!cargando && resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button onClick={() => setVista('todos')} className={`text-left bg-white rounded-xl border p-3 ${vista === 'todos' ? 'border-[#4C7C74] ring-1 ring-[#4C7C74]' : 'border-slate-200 hover:border-slate-300'}`}>
            <div className="text-[11px] text-slate-500">Profesionales con contrato vigente</div>
            <div className="text-xl font-semibold text-slate-800 mt-0.5">{base.length}</div>
          </button>
          <button onClick={() => setVista('sin')} className={`text-left bg-white rounded-xl border p-3 ${vista === 'sin' ? 'border-[#B6522F] ring-1 ring-[#B6522F]' : 'border-slate-200 hover:border-slate-300'}`}>
            <div className="text-[11px] text-slate-500">Sin programar en {resumen.periodo || 'el periodo'}</div>
            <div className="text-xl font-semibold mt-0.5" style={{ color: sinAgendar > 0 ? '#B6522F' : '#1e293b' }}>{sinAgendar}</div>
          </button>
          <button onClick={() => setVista('pendientes')} className={`text-left bg-white rounded-xl border p-3 ${vista === 'pendientes' ? 'border-[#B6522F] ring-1 ring-[#B6522F]' : 'border-slate-200 hover:border-slate-300'}`}>
            <div className="text-[11px] text-slate-500">Programados con horas pendientes</div>
            <div className="text-xl font-semibold mt-0.5" style={{ color: conPendientes > 0 ? '#B6522F' : '#1e293b' }}>{conPendientes}</div>
          </button>
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <div className="text-[11px] text-slate-500">Total horas pendientes por programar</div>
            <div className="text-xl font-semibold mt-0.5" style={{ color: totalPendientes > 0 ? '#B6522F' : '#1e293b' }}>{totalPendientes.toFixed(1)}</div>
          </div>
        </div>
      )}

      {!cargando && resumen && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-72">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, RUT, correlativo, cargo o unidad..."
                className="w-full text-xs rounded-lg border border-slate-300 pl-7 pr-2 py-1.5 bg-white focus:outline-none focus:border-[#4C7C74]"
              />
            </div>
            <select value={vista} onChange={(e) => setVista(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white">
              <option value="todos">Todos los estados</option>
              <option value="programado">Programados</option>
              <option value="sin">Sin programar</option>
              <option value="pendientes">Programados con horas pendientes</option>
              <option value="completo">Programados sin horas pendientes</option>
              <option value="exceso">Programados sobre lo contratado</option>
            </select>
            <FiltroMultiServicio servicios={opcionesCargo} seleccionados={filtroCargos} onCambiar={setFiltroCargos} textoTodos="Todos los cargos" plural="cargos" />
            <FiltroMultiServicio servicios={opcionesUnidad} seleccionados={filtroUnidades} onCambiar={setFiltroUnidades} textoTodos="Todas las unidades" plural="unidades" />
            <FiltroMultiServicio servicios={[SIN_SERVICIO, ...opcionesServicio]} seleccionados={filtroServicios} onCambiar={setFiltroServicios} textoTodos="Todos los servicios programados" plural="servicios" />
            <select value={filtroTurno} onChange={(e) => setFiltroTurno(e.target.value)} className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white">
              <option value="todos">Con y sin turno</option>
              <option value="con">Con turno (Ley 15.076)</option>
              <option value="sin">Sin turno</option>
            </select>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] text-slate-500">Mostrando {items.length} de {todos.length}</span>
            {hayFiltros && <button onClick={limpiarFiltros} className="text-[11px] font-medium text-[#4C7C74] hover:underline">Limpiar filtros</button>}
            <button onClick={exportarFiltrados} disabled={!items.length} className="ml-auto text-xs text-[#2F6C5D] border border-[#4C7C74] rounded-lg px-2.5 py-1 flex items-center gap-1.5 hover:bg-[#EBF5F2] disabled:opacity-50">
              <Download size={12} /> Exportar a Excel ({items.length})
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Nombre</th>
              <th className="text-left px-3 py-2 font-medium">RUT</th>
              <th className="text-left px-3 py-2 font-medium" title="Correlativo de contrato en Dotación">Correl.</th>
              {verPlanta && <th className="text-left px-3 py-2 font-medium">Planta</th>}
              <th className="text-left px-3 py-2 font-medium">Cargo / Unidad</th>
              <th className="text-left px-3 py-2 font-medium">Servicio(s) programado(s)</th>
              <th className="text-right px-3 py-2 font-medium">Contratadas</th>
              <th className="text-right px-3 py-2 font-medium">Programadas</th>
              <th className="text-right px-3 py-2 font-medium">Pendientes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.rut} className="border-t border-slate-100">
                <td className="px-3 py-1.5 text-slate-700">
                  {i.nombre}
                  {i.tieneTurno && <span className="ml-1.5 inline-block text-[10px] font-semibold text-[#B6522F] bg-[#FBEEE8] px-1.5 py-0.5 rounded-full">Turno</span>}
                </td>
                <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{i.rut}-{i.dv}</td>
                <td className="px-3 py-1.5 text-slate-500">{(i.correlativos || []).join(' / ') || '—'}</td>
                {verPlanta && <td className="px-3 py-1.5 text-slate-500">{HR_PLANTA_LABEL[i.planta] || i.planta}</td>}
                <td className="px-3 py-1.5 text-slate-500">{i.cargo || '—'}{i.unidad ? ` · ${i.unidad}` : ''}</td>
                <td className="px-3 py-1.5 text-slate-500">
                  {i.sinAgendar ? (
                    <span className="text-[10px] font-semibold text-[#B6522F] bg-[#FBEEE8] px-1.5 py-0.5 rounded-full">Sin agendar</span>
                  ) : (
                    <>
                      {i.servicios.join(', ')}
                      {i.coincidenciaPorNombre && <span className="ml-1.5 text-[10px] text-slate-400 italic">(por nombre)</span>}
                    </>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right text-slate-600">{i.horasContratadas.toFixed(1)}</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{i.horasProgramadas.toFixed(1)}</td>
                <td className="px-3 py-1.5 text-right font-medium" style={{ color: i.horasPendientes > 0 ? '#B6522F' : '#1e293b' }}>{i.horasPendientes.toFixed(1)}</td>
              </tr>
            ))}
            {cargando && (
              <tr><td colSpan={verPlanta ? 9 : 8} className="px-3 py-6 text-center text-slate-400 italic">Cargando...</td></tr>
            )}
            {!cargando && items.length === 0 && (
              <tr><td colSpan={verPlanta ? 9 : 8} className="px-3 py-6 text-center text-slate-400 italic">{todos.length ? 'Nadie coincide con el filtro.' : 'Sin datos — carga una planilla RRHH para empezar.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Carga masiva de una agenda completa desde Excel (menú "Cargar Agenda"). Exige coincidencia
// exacta contra el catálogo — a diferencia de las importaciones puntuales que se hacen a mano,
// esta ruta no adivina sinónimos ni corrige tipeos, así que quien prepara el archivo tiene que
// usar el texto real de cada actividad. Flujo en dos pasos (validar -> confirmar) para nunca
// escribir en la base sin que el usuario haya visto primero el detalle de lo que se va a aplicar.
function CargarAgendaTab({ agendas }) {
  const [modo, setModo] = useState('update');
  const [externalId, setExternalId] = useState('');
  const [profesiones, setProfesiones] = useState([]);
  const [profesion, setProfesion] = useState('');
  const [especialidades, setEspecialidades] = useState([]);
  const [especialidad, setEspecialidad] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [serviceName, setServiceName] = useState('');
  const [chiefName, setChiefName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [monthLabel, setMonthLabel] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [preview, setPreview] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aplicado, setAplicado] = useState(null);
  // Correcciones puntuales que el usuario acepta con un clic sobre una sugerencia (ver
  // erroresValidacion[].sugerencias) — nunca se aplican solas, cada una vuelve a pasar por
  // /preview para confirmar que el texto sugerido sí resuelve en el catálogo.
  const [overrides, setOverrides] = useState({});

  useEffect(() => {
    fetchCatalogProfessions().then(setProfesiones).catch(() => setProfesiones([]));
  }, []);

  useEffect(() => {
    setEspecialidad('');
    if (!profesion) { setEspecialidades([]); return; }
    fetchCatalogSpecialties(profesion).then(setEspecialidades).catch(() => setEspecialidades([]));
  }, [profesion]);

  function construirCampos(overridesActuales = overrides) {
    const base = { mode: modo, profession: profesion, specialty: especialidad };
    if (Object.keys(overridesActuales).length > 0) base.overrides = JSON.stringify(overridesActuales);
    if (modo === 'update') return { ...base, externalId };
    return { ...base, serviceName, chiefName, groupName, monthLabel, validFrom, validTo };
  }

  const formularioListo = Boolean(
    archivo && profesion && especialidad && (modo === 'update' ? externalId : serviceName.trim())
  );

  async function handleValidar(overridesActuales = overrides) {
    setCargando(true); setError(''); setPreview(null); setAplicado(null);
    try {
      const resultado = await previewAgendaExcel(archivo, construirCampos(overridesActuales));
      setPreview(resultado);
    } catch (e) {
      setError(e.message || 'No se pudo validar el archivo.');
    } finally {
      setCargando(false);
    }
  }

  function handleAceptarSugerencia(actividad, sugerencia) {
    const nuevos = { ...overrides, [actividad]: sugerencia };
    setOverrides(nuevos);
    handleValidar(nuevos);
  }

  async function handleConfirmar() {
    setCargando(true); setError('');
    try {
      const resultado = await applyAgendaExcel(archivo, construirCampos());
      setAplicado(resultado);
      setPreview(null);
      setArchivo(null);
    } catch (e) {
      setError(e.message || 'No se pudo aplicar la importación.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="h-full overflow-auto p-4 md:p-5 space-y-4 max-w-3xl">
      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
        Sube un Excel con una hoja por profesional (bloque RUT/NOMBRE/ESPECIALIDAD arriba + grilla
        DIA/DESDE/HASTA/ACTIVIDAD/BOX/CUPOS abajo). Si una actividad no coincide exacto con el
        catálogo, se te muestran sugerencias por similitud para aceptar con un clic — nunca se
        corrige nada sin que la confirmes tú.
      </div>

      <div className="flex items-center gap-2">
        {[{ id: 'update', label: 'Actualizar agenda existente' }, { id: 'create', label: 'Crear especialidad nueva' }].map((m) => (
          <button
            key={m.id}
            onClick={() => { setModo(m.id); setPreview(null); setAplicado(null); setError(''); setOverrides({}); }}
            className={`text-xs px-3 py-1.5 rounded-full border ${modo === m.id ? 'bg-[#4C7C74] text-white border-[#4C7C74]' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        {modo === 'update' ? (
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Agenda a actualizar</label>
            <select value={externalId} onChange={(e) => setExternalId(e.target.value)} className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-2 bg-white">
              <option value="">Selecciona una agenda...</option>
              {agendas.map((a) => (
                <option key={a.id} value={a.id}>{a.servicio} (v{a.version})</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] text-slate-500 mb-1">Nombre del servicio</label>
              <input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Ej. Urología Adulto" className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-2" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Jefe de servicio (opcional)</label>
              <input value={chiefName} onChange={(e) => setChiefName(e.target.value)} className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-2" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Grupo (opcional, ej. "Ginecología y Obstetricia")</label>
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-2" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Mes / periodo</label>
              <input value={monthLabel} onChange={(e) => setMonthLabel(e.target.value)} placeholder="Ej. Septiembre - Diciembre 2026" className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-2" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Vigente desde</label>
              <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-2" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Vigente hasta</label>
              <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-2" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Profesión</label>
            <select value={profesion} onChange={(e) => setProfesion(e.target.value)} className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-2 bg-white">
              <option value="">Selecciona...</option>
              {profesiones.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Especialidad (catálogo)</label>
            <select value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} disabled={!profesion} className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-2 bg-white disabled:bg-slate-50">
              <option value="">{profesion ? 'Selecciona...' : 'Elige una profesión primero'}</option>
              {especialidades.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-slate-500 mb-1">Archivo Excel</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => { setArchivo(e.target.files?.[0] || null); setPreview(null); setAplicado(null); setError(''); setOverrides({}); }}
            className="w-full text-xs"
          />
        </div>

        <button
          onClick={handleValidar}
          disabled={!formularioListo || cargando}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {cargando ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />} Validar archivo
        </button>
      </div>

      {error && (
        <div className="text-xs text-[#B6522F] bg-[#FBEEE8] border border-[#F0C7B4] rounded-xl p-3">{error}</div>
      )}

      {preview && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-700">
              {preview.totalProfesionales} profesionales · {preview.totalBloques} bloques
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${preview.puedeAplicar ? 'bg-[#EBF5F2] text-[#4C7C74]' : 'bg-[#FBEEE8] text-[#B6522F]'}`}>
              {preview.puedeAplicar ? 'Listo para aplicar' : `${preview.erroresValidacion.length} error(es)`}
            </span>
          </div>

          {Object.keys(overrides).length > 0 && (
            <div className="text-[11px] bg-[#F1EDFB] border border-[#DCD1F2] rounded-lg p-2.5 space-y-1">
              <div className="font-medium text-slate-600">Correcciones aceptadas:</div>
              {Object.entries(overrides).map(([original, corregido]) => (
                <div key={original} className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 truncate">"{original}" → "{corregido}"</span>
                  <button
                    onClick={() => {
                      const nuevos = { ...overrides };
                      delete nuevos[original];
                      setOverrides(nuevos);
                      handleValidar(nuevos);
                    }}
                    className="text-[10px] text-[#B6522F] hover:underline shrink-0"
                  >
                    Deshacer
                  </button>
                </div>
              ))}
            </div>
          )}

          {preview.erroresValidacion.length > 0 && (
            <div className="text-xs">
              <div className="font-medium text-slate-600 mb-1">Actividades sin coincidencia exacta en el catálogo:</div>
              <ul className="space-y-2">
                {preview.erroresValidacion.map((err) => (
                  <li key={err.actividad}>
                    <div className="text-[#B6522F]">"{err.actividad}" — {err.mensaje}</div>
                    {err.sugerencias.length > 0 ? (
                      <div className="flex items-center flex-wrap gap-1.5 mt-1">
                        <span className="text-[10px] text-slate-400">¿Quisiste decir?</span>
                        {err.sugerencias.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleAceptarSugerencia(err.actividad, s)}
                            disabled={cargando}
                            className="text-[11px] px-2 py-1 rounded-full border border-[#BFE0D6] bg-[#EBF5F2] text-[#4C7C74] hover:bg-[#DCEEE8] disabled:opacity-50"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 mt-0.5">Sin sugerencias parecidas — corrige el texto en el Excel y vuelve a validar.</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs">
            <div className="font-medium text-slate-600 mb-1">Profesionales detectados:</div>
            <ul className="space-y-0.5 max-h-48 overflow-y-auto">
              {preview.profesionales.map((p) => (
                <li key={p.sheet} className="text-slate-500">
                  {p.nombre} {p.rut ? `(${p.rut})` : '(sin RUT)'} — {p.bloques} bloques
                </li>
              ))}
            </ul>
          </div>

          {preview.omitidas.length > 0 && (
            <details className="text-[11px] text-slate-400">
              <summary className="cursor-pointer">{preview.omitidas.length} hoja(s) omitida(s) (resúmenes/plantillas)</summary>
              <ul className="mt-1 space-y-0.5">
                {preview.omitidas.map((o) => <li key={o.sheet}>{o.sheet}: {o.motivo}</li>)}
              </ul>
            </details>
          )}

          {preview.puedeAplicar && (
            <button
              onClick={handleConfirmar}
              disabled={cargando}
              style={{ background: '#4C7C74' }}
              className="flex items-center gap-1.5 text-white text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50"
            >
              {cargando ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Confirmar e importar
            </button>
          )}
        </div>
      )}

      {aplicado && (
        <div className="text-xs text-[#4C7C74] bg-[#EBF5F2] border border-[#BFE0D6] rounded-xl p-3">
          Importado correctamente: {aplicado.profesionales} profesionales, {aplicado.bloques} bloques
          en la agenda "{aplicado.externalId}".
        </div>
      )}
    </div>
  );
}

// "Comparación RRHH / Infraestructura" — hoy solo tiene el factor Pabellón, pero se arma con un
// selector de factor desde el principio para que sumar los próximos (box, camas, etc.) sea
// agregar una opción más acá, no rehacer la pestaña.
const FACTORES_INFRAESTRUCTURA = [
  { id: 'pabellon', label: 'Pabellón' },
];

function InfraestructuraTab({ resumenPabellon, cargandoPabellon, errorPabellon, onSubirPlanillaPabellon }) {
  const [factor, setFactor] = useState('pabellon');

  return (
    <div className="h-full overflow-auto p-4 md:p-5 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-slate-500">Factor productivo:</span>
        {FACTORES_INFRAESTRUCTURA.map((f) => (
          <button
            key={f.id}
            onClick={() => setFactor(f.id)}
            className={`text-xs px-2.5 py-1 rounded-full border ${factor === f.id ? 'bg-[#4C7C74] text-white border-[#4C7C74]' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'}`}
          >
            {f.label}
          </button>
        ))}
        <span className="text-[11px] text-slate-400 italic">más factores próximamente</span>
      </div>
      {factor === 'pabellon' && (
        <PabellonPanel
          resumen={resumenPabellon}
          cargando={cargandoPabellon}
          error={errorPabellon}
          onSubirPlanilla={onSubirPlanillaPabellon}
        />
      )}
    </div>
  );
}

// Color estable a partir de un texto (hash simple -> HSL) para pintar las celdas de la grilla
// de pabellón por especialidad sin tener que mantener una paleta fija a mano.
function colorParaTexto(texto) {
  let hash = 0;
  for (let i = 0; i < texto.length; i += 1) hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return { bg: `hsl(${hue}, 65%, 94%)`, border: `hsl(${hue}, 45%, 75%)`, text: `hsl(${hue}, 55%, 30%)` };
}

// Grilla visual de la planificación de pabellón, igual en estructura a la planilla original:
// por grupo (ej. Cirugía Mayor Ambulatoria / Cirugía Mayor), filas = pabellón+jornada,
// columnas = día, celda = especialidad asignada (coloreada).
function GrillaPabellon({ grid }) {
  if (!grid || grid.length === 0) return null;
  return (
    <div className="space-y-4">
      {grid.map((g) => (
        <div key={g.grupo} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">{g.grupo}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="text-slate-500">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium">Pabellón</th>
                  <th className="text-left px-2 py-1.5 font-medium">Jornada</th>
                  {g.dias.map((d) => (
                    <th key={d} className="text-left px-2 py-1.5 font-medium">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.pabellones.flatMap((pab) => ['Mañana', 'Tarde'].map((jornada) => {
                  const key = `${pab}|||${jornada}`;
                  const fila = g.celdas[key];
                  if (!fila) return null;
                  return (
                    <tr key={key} className="border-t border-slate-100">
                      <td className="px-2 py-1 text-slate-700 font-medium">{pab}</td>
                      <td className="px-2 py-1 text-slate-500">{jornada}</td>
                      {g.dias.map((d) => {
                        const texto = fila[d];
                        if (!texto) return <td key={d} className="px-2 py-1"></td>;
                        const c = colorParaTexto(texto);
                        return (
                          <td key={d} className="px-1.5 py-1">
                            <span
                              className="inline-block rounded-md px-1.5 py-0.5 border text-[10px] leading-tight"
                              style={{ background: c.bg, borderColor: c.border, color: c.text }}
                            >
                              {texto}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// Mini mapa de calor día×bloque-30min para comparar "planificado" vs "programado" en las mismas
// unidades (horas), reutilizando heatColor (misma escala de color que el resto de la app). El
// número en una celda "programado" es la cantidad de profesionales con bloque programado en ese
// horario según la agenda semanal — se muestra a la vista, pero NO equivale a "pabellones
// necesarios": la agenda es una plantilla semanal fija y no distingue si esos profesionales
// realmente coinciden la misma semana o si rotan por el mismo pabellón (a confirmar con cada
// servicio caso a caso).
function MiniHeatmapGrid({ dias, bloques, valores, paralelos, maxReferencia, mostrarValor, enteros, unidad }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `34px repeat(${dias.length}, 30px)`, gap: 2, width: 'max-content' }}>
      <div />
      {dias.map((d) => (
        <div key={d} className="text-[9px] text-slate-500 font-medium text-center">{d.slice(0, 3)}</div>
      ))}
      {bloques.map((b) => (
        <React.Fragment key={b}>
          <div className="text-[8px] text-slate-400 flex items-center justify-end pr-1">{b.endsWith(':00') ? b.slice(0, 2) : ''}</div>
          {dias.map((d) => {
            const valor = valores?.[d]?.[b] || 0;
            // Piso de intensidad: cualquier celda con valor > 0 se ve claramente coloreada, no se
            // deja que un máximo alto (ej. el lado "programado") deje pálido el lado "asignado".
            const pct = valor > 0 && maxReferencia > 0 ? Math.max(35, (valor / maxReferencia) * 100) : 0;
            const color = heatColor(pct);
            const par = paralelos?.[d]?.[b] || 0;
            const valorTexto = enteros ? String(Math.round(valor)) : valor.toFixed(1);
            return (
              <div
                key={d}
                title={`${d} ${b} — ${valorTexto} ${unidad || 'hrs'}${par ? ` · ${par} profesional${par === 1 ? '' : 'es'} con bloque programado (puede incluir rotación no capturada)` : ''}`}
                style={{ background: valor > 0 ? color.bg : '#F8FAFC', height: 16, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {par > 1 && <span style={{ color: color.text, fontSize: 8, fontWeight: 700 }}>{par}</span>}
                {par <= 1 && mostrarValor && valor > 0 && <span style={{ color: color.text, fontSize: 7, fontWeight: 600 }}>{valorTexto}</span>}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

// Cruza la planificación semanal de pabellón (qué especialidad tiene asignado cada pabellón,
// por jornada y día) contra los bloques "Pabellon..." realmente programados en cada servicio.
// La comparación es en HORAS, no en "pabellones simultáneos": un mismo pabellón puede operar
// legítimamente con 2-3 cirujanos a la vez, así que contar profesionales en paralelo como si cada
// uno ocupara un pabellón distinto sobreestima la brecha. En horas esa concurrencia deja de ser un
// problema (las horas de cada profesional simplemente se suman) y el número de profesionales en
// paralelo se muestra aparte en la grilla, a la vista, para que se pueda juzgar si es normal.
function PabellonPanel({ resumen, cargando, error, onSubirPlanilla }) {
  const [subiendo, setSubiendo] = useState(false);
  const [subidaError, setSubidaError] = useState('');
  const [subidaOk, setSubidaOk] = useState('');
  const [detalleAbierto, setDetalleAbierto] = useState(null);
  const [mostrarGrilla, setMostrarGrilla] = useState(false);
  const fileInputRef = useRef(null);

  async function manejarArchivo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSubiendo(true);
    setSubidaError('');
    setSubidaOk('');
    try {
      const result = await onSubirPlanilla(file);
      setSubidaOk(`Se importaron ${result.filasImportadas} asignaciones (hoja "${result.hoja}").`);
    } catch (err) {
      setSubidaError(err.message || 'No se pudo importar el archivo.');
    } finally {
      setSubiendo(false);
    }
  }

  const items = resumen?.items || [];
  const dias = resumen?.dias || [];
  const bloques = resumen?.bloques || [];
  const totalAsignadas = items.reduce((s, i) => s + i.horasAsignadas, 0);
  const totalProgramadas = items.reduce((s, i) => s + (i.cargado ? i.horasProgramadas : 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">Planificación de pabellón</div>
            <div className="text-xs text-slate-500 mt-1">
              {resumen?.ultimaImportacion
                ? `Última planilla cargada: ${new Date(resumen.ultimaImportacion).toLocaleString('es-CL')}`
                : 'Todavía no se ha cargado ninguna planilla de pabellón.'}
            </div>
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={manejarArchivo} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={subiendo}
              style={{ background: '#4C7C74' }}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {subiendo ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              {subiendo ? 'Cargando...' : 'Cargar planilla de pabellón'}
            </button>
          </div>
        </div>
        {subidaError && <div className="mt-3 rounded-xl bg-[#FBEEE8] px-3 py-2 text-xs text-[#B6522F]">{subidaError}</div>}
        {subidaOk && <div className="mt-3 rounded-xl bg-[#EBF5F2] px-3 py-2 text-xs text-[#2F6C5D]">{subidaOk}</div>}
        <div className="mt-3 text-[11px] text-slate-400">
          Cada carga reemplaza por completo la planificación anterior. La comparación es en horas:
          "asignadas" son las horas de pabellón que la planilla le da a la especialidad (jornada
          Mañana/Tarde asumida en ventanas estándar, ya que la planilla no trae hora exacta);
          "programadas" son las horas reales cargadas en la agenda.
        </div>
        <div className="mt-2 rounded-xl bg-[#FBF6E8] px-3 py-2 text-[11px] text-[#8A6C1E]">
          Ojo: la agenda registra un bloque semanal fijo por profesional (ej. "Lunes mañana Pabellón"),
          pero no distingue si ese profesional está realmente esa semana o si rota con otros por el
          mismo pabellón. Si en un bloque aparecen más profesionales "en paralelo" que pabellones
          asignados, puede ser rotación no capturada por la app (revisar con el servicio) y no
          necesariamente una sobre-programación real.
        </div>
      </div>

      {error && <div className="rounded-xl bg-[#FBEEE8] px-3 py-2 text-xs text-[#B6522F]">{error}</div>}

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Horas asignadas / sem.</div>
            <div className="text-xl font-semibold text-slate-800 mt-1">{totalAsignadas.toFixed(1)} hrs</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Horas programadas / sem.</div>
            <div className="text-xl font-semibold text-slate-800 mt-1">{totalProgramadas.toFixed(1)} hrs</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Diferencia</div>
            <div className="text-xl font-semibold mt-1" style={{ color: totalProgramadas - totalAsignadas !== 0 ? '#B6522F' : '#1e293b' }}>
              {totalProgramadas - totalAsignadas > 0 ? '+' : ''}{(totalProgramadas - totalAsignadas).toFixed(1)} hrs
            </div>
          </div>
        </div>
      )}

      {resumen?.grid?.length > 0 && (
        <div>
          <button
            onClick={() => setMostrarGrilla((v) => !v)}
            className="text-xs font-medium text-[#4C7C74] hover:underline flex items-center gap-1"
          >
            {mostrarGrilla ? '▲' : '▼'} {mostrarGrilla ? 'Ocultar' : 'Ver'} planificación de pabellón (grilla original)
          </button>
          {mostrarGrilla && <div className="mt-2"><GrillaPabellon grid={resumen.grid} /></div>}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Especialidad</th>
              <th className="text-right px-3 py-2 font-medium">Horas asignadas / sem.</th>
              <th className="text-right px-3 py-2 font-medium">Horas programadas / sem.</th>
              <th className="text-right px-3 py-2 font-medium">Diferencia</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const expandido = detalleAbierto === i.servicio;
              return (
                <React.Fragment key={i.servicio}>
                  <tr
                    className="border-t border-slate-100 cursor-pointer hover:bg-slate-50/60"
                    onClick={() => setDetalleAbierto(expandido ? null : i.servicio)}
                  >
                    <td className="px-3 py-1.5 text-slate-700">
                      {i.servicio}
                      {!i.cargado && <span className="ml-1.5 inline-block text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">No cargado aún</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-600">{i.horasAsignadas.toFixed(1)} hrs</td>
                    <td className="px-3 py-1.5 text-right text-slate-600">{i.cargado ? `${i.horasProgramadas.toFixed(1)} hrs` : '—'}</td>
                    <td className="px-3 py-1.5 text-right font-medium" style={{ color: i.cargado && i.diferenciaHoras !== 0 ? '#B6522F' : '#1e293b' }}>
                      {i.cargado ? `${i.diferenciaHoras > 0 ? '+' : ''}${i.diferenciaHoras.toFixed(1)} hrs` : '—'}
                    </td>
                    <td className="px-2 text-center text-slate-400">{expandido ? '▲' : '▼'}</td>
                  </tr>
                  {expandido && (
                    <tr className="border-t border-slate-100 bg-slate-50/50">
                      <td colSpan={5} className="px-3 py-3 space-y-4">
                        {(i.grupos || []).map((g) => {
                          const maxAsignado = Math.max(1, ...dias.flatMap((d) => bloques.map((b) => g.gridAsignado?.[d]?.[b] || 0)));
                          const maxProgramado = Math.max(1, ...dias.flatMap((d) => bloques.map((b) => g.gridProgramado?.[d]?.[b] || 0)));
                          return (
                            <div key={g.grupo}>
                              <div className="text-xs font-semibold text-slate-600 mb-2">{g.grupo}</div>
                              <div className="flex flex-wrap gap-6">
                                <div>
                                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Asignado (planilla) — {g.horasAsignadas.toFixed(1)} hrs/sem.</div>
                                  <MiniHeatmapGrid dias={dias} bloques={bloques} valores={g.gridAsignado} maxReferencia={maxAsignado} mostrarValor enteros unidad="pabellón(es)" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Programado (agenda real) — {g.horasProgramadas.toFixed(1)} hrs/sem.</div>
                                  <MiniHeatmapGrid dias={dias} bloques={bloques} valores={g.gridProgramado} paralelos={g.gridParalelos} maxReferencia={maxProgramado} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {(!i.grupos || i.grupos.length === 0) && (
                          <div className="text-[11px] text-slate-400 italic">Sin asignaciones de pabellón para esta especialidad.</div>
                        )}
                        {i.horasProgramadasSinGrupo > 0 && (
                          <div className="text-[11px] text-[#B6522F]">
                            {i.horasProgramadasSinGrupo.toFixed(1)} hrs/sem. programadas con actividad "Pabellon..." que no calzan con ninguno de los grupos de la planilla (nombre de actividad distinto) — no están incluidas arriba.
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">
                          Cada grilla usa su propia escala de color (el color no se compara 1 a 1 entre ambas). El número "asignado" es la cantidad de pabellones de ese grupo asignados en el bloque; en "programado" es la cantidad de profesionales con bloque programado ese horario — no confirma que todos coincidan la misma semana si el servicio rota por los pabellones. Pasa el mouse sobre una celda para ver el detalle exacto.
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {cargando && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400 italic">Cargando...</td></tr>
            )}
            {!cargando && items.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400 italic">Sin datos — carga una planilla de pabellón para empezar.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-slate-400">
        Diferencia = horas programadas − horas asignadas. Positivo: el servicio programa más horas de pabellón de las que tiene asignadas. Negativo: le queda pabellón asignado sin usar. Haz clic en una fila para ver el mapa de bloques del detalle.
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState('jefe_servicio');
  const [miServicio, setMiServicio] = useState(SERVICIOS[0]);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [services, setServices] = useState(SERVICIOS.map((name) => ({ name, specialtyCatalog: ESPECIALIDAD_POR_SERVICIO[name] || 'No Aplica' })));
  const [agendas, setAgendas] = useState([]);
  // Periodo de programación activo (año). null = aún no elegido -> se usa el más reciente con
  // agendas. Toda la plataforma (tablero, resumen, historial, RRHH, pabellón) muestra solo este
  // periodo, para que la agenda vigente y la del próximo año de un servicio no se sumen.
  const [periodoElegido, setPeriodoElegido] = useState(null);
  const periodosDisponibles = useMemo(
    () => [...new Set(agendas.map((a) => a.periodo).filter(Boolean))].sort((a, b) => b - a),
    [agendas]
  );
  // El próximo año siempre está disponible para empezar a programarlo aunque aún no tenga
  // agendas, y es el periodo por defecto (proceso de programación del año siguiente).
  const proximoPeriodo = new Date().getFullYear() + 1;
  const opcionesPeriodo = useMemo(
    () => [...new Set([...periodosDisponibles, proximoPeriodo])].sort((a, b) => b - a),
    [periodosDisponibles, proximoPeriodo]
  );
  const periodo = periodoElegido ?? opcionesPeriodo[0];
  const [backendStatus, setBackendStatus] = useState('connecting');
  const [syncLabel, setSyncLabel] = useState('Conectando...');
  const [isHydrated, setIsHydrated] = useState(false);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('tablero');
  const [showNuevo, setShowNuevo] = useState(false);
  const [showEditorFor, setShowEditorFor] = useState(null);
  const [pendingReject, setPendingReject] = useState(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showServicioMenu, setShowServicioMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [resumenLoading, setResumenLoading] = useState(false);
  const [usersCatalog, setUsersCatalog] = useState([]);
  const [resumenRrhh, setResumenRrhh] = useState(null);
  const [cargandoRrhh, setCargandoRrhh] = useState(false);
  const [errorRrhh, setErrorRrhh] = useState('');
  const [plantaRrhh, setPlantaRrhh] = useState('TODAS');
  const [resumenPabellon, setResumenPabellon] = useState(null);
  const [cargandoPabellon, setCargandoPabellon] = useState(false);
  const [errorPabellon, setErrorPabellon] = useState('');

  async function hydrateAuthenticatedApp(sessionUser = null) {
    const currentUser = sessionUser || (await fetchMe()).user;
    const [health, bootstrap, storedAgendas, notifications] = await Promise.all([
      fetchHealth(),
      fetchBootstrap(),
      fetchAgendas(),
      fetchNotifications(),
    ]);

    setAuthUser(currentUser);
    setRole(currentUser.role);
    setMiServicio(currentUser.serviceName || bootstrap.services[0]?.name || SERVICIOS[0]);
    setServices(bootstrap.services);
    setUsersCatalog(bootstrap.users || []);
    setAgendas(storedAgendas.length > 0 ? storedAgendas : []);
    setNotifs(notifications.map((item) => ({ text: item.texto, role: item.destinoRol || currentUser.role, fecha: item.fecha })));
    setBackendStatus(health.ok ? 'online' : 'offline');
    setSyncLabel(storedAgendas.length > 0 ? 'Sincronizado con API' : 'API lista para primer guardado');
    setIsHydrated(true);
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        if (cancelled) return;
        await hydrateAuthenticatedApp();
      } catch (_error) {
        if (cancelled) return;
        setBackendStatus('offline');
        setSyncLabel('Inicia sesión para usar la API');
      } finally {
        if (!cancelled) {
          setAuthReady(true);
          setIsHydrated(true);
        }
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cada acción (crear/editar bloque, profesional, etc.) ya se guarda individualmente contra su
  // propio endpoint en el momento en que ocurre — no existe un reenvío periódico del estado completo.

  async function handleLogin(payload) {
    setAuthLoading(true);
    setAuthError('');
    try {
      const result = payload.mode === 'demo'
        ? await demoLogin(payload.role)
        : await login(payload.email, payload.password);
      await hydrateAuthenticatedApp(result.user);
    } catch (error) {
      setAuthError('No fue posible iniciar sesión.');
    } finally {
      setAuthLoading(false);
      setAuthReady(true);
    }
  }

  async function handleLogout() {
    await logout();
    setAuthUser(null);
    setAuthReady(true);
    setAgendas([]);
    setNotifs([]);
    setUsersCatalog([]);
    setBackendStatus('offline');
    setSyncLabel('Sesión cerrada');
  }

  const agendasDelPeriodo = useMemo(
    () => agendas.filter((a) => (a.periodo ?? periodo) === periodo),
    [agendas, periodo]
  );

  const agendasVisibles = useMemo(() => {
    const confirmadas = agendasDelPeriodo.filter((a) => !a.pendienteConfirmar);
    if (role === 'jefe_servicio') {
      // Un jefe puede tener más de un servicio a cargo (ej. Pediatría y sus subespecialidades
      // comparten un mismo jefe) — el backend ya manda su lista completa en serviceNames.
      const misServicios = authUser?.serviceNames?.length ? authUser.serviceNames : [miServicio];
      return confirmadas.filter((a) => misServicios.includes(a.servicio));
    }
    return confirmadas; // referente, admisión y subdirección ven todas las agendas confirmadas
  }, [agendasDelPeriodo, role, miServicio, authUser]);

  const columnas = useMemo(() => {
    const map = {};
    COLUMN_ORDER.forEach((e) => (map[e] = []));
    agendasVisibles.forEach((a) => map[a.estado].push(a));
    COLUMN_ORDER.forEach((e) => map[e].sort((a, b) => b.lastUpdated - a.lastUpdated));
    return map;
  }, [agendasVisibles]);

  function notify(text, targetRole) {
    setNotifs((n) => [{ text, role: targetRole, fecha: nowStr() }, ...n]);
  }

  function updateAgenda(id, updater) {
    setAgendas((prev) => prev.map((a) => (a.id === id ? updater({ ...a }) : a)));
  }

  function replaceAgendaState(nextAgenda) {
    setAgendas((prev) => {
      const exists = prev.some((item) => item.id === nextAgenda.id);
      if (!exists) return [nextAgenda, ...prev];
      return prev.map((item) => (item.id === nextAgenda.id ? nextAgenda : item));
    });
    setSelected((current) => (current?.id === nextAgenda.id ? nextAgenda : current));
    return nextAgenda;
  }

  async function refreshAgendaState(externalId) {
    const refreshed = await fetchAgenda(externalId);
    replaceAgendaState(refreshed);
    return refreshed;
  }

  // Ediciones de bloques en cola por agenda: se envían al servidor de a una y en orden, y la
  // agenda se recarga solo cuando ya no queda ninguna pendiente. Sin esto, varios cambios
  // seguidos en una fila (día, horas, prestación, turno) disparaban recargas en paralelo y una
  // respuesta vieja podía llegar al final y "borrar" lo recién escrito.
  const colaEdicionesRef = useRef({}); // { [agendaId]: { cola: Promise, pendientes: number } }
  function encolarEdicion(externalId, tarea) {
    const estado = colaEdicionesRef.current[externalId] || (colaEdicionesRef.current[externalId] = { cola: Promise.resolve(), pendientes: 0 });
    estado.pendientes += 1;
    const ejecucion = estado.cola.then(tarea);
    estado.cola = ejecucion
      .catch(() => {
        setSyncLabel('No se pudo guardar un cambio — se recargó la agenda');
      })
      .finally(async () => {
        estado.pendientes -= 1;
        if (estado.pendientes === 0) {
          try {
            const refrescada = await fetchAgenda(externalId);
            // Si mientras se recargaba entró otro cambio, no se pisa: esa edición recargará al terminar.
            if (estado.pendientes === 0) replaceAgendaState(refrescada);
          } catch (_error) { /* se reintenta en la próxima edición */ }
        }
      });
    return estado.cola;
  }

  async function refreshUsersCatalog() {
    if (!authUser || authUser.role !== 'admin') return;
    const users = await fetchUsers();
    setUsersCatalog(users);
  }

  async function handleCreateUser(payload) {
    const created = await createUser(payload);
    await refreshUsersCatalog();
    return created;
  }

  const HR_ROLES = ['admin', 'subdirector', 'referente_programacion'];
  // Distinto de HR_ROLES a propósito: cargar agendas por Excel exige conocer el texto exacto del
  // catálogo (sin corrección automática de sinónimos), así que se restringe a admin/referente en
  // vez de abrirlo también a subdirector.
  const IMPORT_AGENDA_ROLES = ['admin', 'referente_programacion'];

  async function refreshHrSummary(planta) {
    if (!authUser || !HR_ROLES.includes(authUser.role)) return;
    setCargandoRrhh(true);
    setErrorRrhh('');
    try {
      const data = await fetchHrSummary({ planta: planta || plantaRrhh, periodo });
      setResumenRrhh(data);
    } catch (err) {
      setErrorRrhh(err.message || 'No se pudo cargar el resumen de RRHH.');
    } finally {
      setCargandoRrhh(false);
    }
  }

  async function handleUploadHrDotacion(file) {
    const result = await uploadHrDotacion(file);
    await refreshHrSummary();
    return result;
  }

  useEffect(() => {
    if (tab === 'rrhh') refreshHrSummary(plantaRrhh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, plantaRrhh, periodo]);

  async function refreshPabellonSummary() {
    if (!authUser || !HR_ROLES.includes(authUser.role)) return;
    setCargandoPabellon(true);
    setErrorPabellon('');
    try {
      const data = await fetchPabellonSummary({ periodo });
      setResumenPabellon(data);
    } catch (err) {
      setErrorPabellon(err.message || 'No se pudo cargar la planificación de pabellón.');
    } finally {
      setCargandoPabellon(false);
    }
  }

  async function handleUploadPabellonPlan(file) {
    const result = await uploadPabellonPlan(file);
    await refreshPabellonSummary();
    return result;
  }

  useEffect(() => {
    if (tab === 'infraestructura') refreshPabellonSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, periodo]);

  async function refreshNotifications() {
    try {
      const notifications = await fetchNotifications();
      setNotifs(notifications.map((item) => ({ text: item.texto, role: item.destinoRol || role, fecha: item.fecha })));
    } catch (_error) {
      // Preserve local notifications if the API call fails.
    }
  }

  async function handleAction(action, agenda, payload) {
    if (action === 'editar_cne') {
      updateAgenda(agenda.id, (a) => {
        a.cnePct = payload.valor;
        a.lastUpdated = Date.now();
        return a;
      });
      setSelected((s) => (s ? { ...s, cnePct: payload.valor } : s));
      try {
        await updateAgendaFields(agenda.id, { cnePct: payload.valor });
      } catch (_error) {
        setSyncLabel('No se pudo guardar el %CNE en el servidor.');
      }
      return;
    }
    if (action === 'editar_atenciones') {
      updateAgenda(agenda.id, (a) => {
        a.atenciones = payload.valor;
        a.lastUpdated = Date.now();
        return a;
      });
      setSelected((s) => (s ? { ...s, atenciones: payload.valor } : s));
      try {
        await updateAgendaFields(agenda.id, { atenciones: payload.valor });
      } catch (_error) {
        setSyncLabel('No se pudo guardar las atenciones en el servidor.');
      }
      return;
    }
    if (action === 'editar_distribucion') {
      const nuevaDistribucion = {
        ...agenda.distribucionHoraria,
        [payload.dia]: { ...agenda.distribucionHoraria[payload.dia], [payload.bloque]: payload.valor },
      };
      updateAgenda(agenda.id, (a) => {
        a.distribucionHoraria = { ...a.distribucionHoraria, [payload.dia]: { ...a.distribucionHoraria[payload.dia], [payload.bloque]: payload.valor } };
        a.lastUpdated = Date.now();
        return a;
      });
      setSelected((s) => (s ? { ...s, distribucionHoraria: { ...s.distribucionHoraria, [payload.dia]: { ...s.distribucionHoraria[payload.dia], [payload.bloque]: payload.valor } } } : s));
      try {
        await updateAgendaFields(agenda.id, { distribucionHoraria: nuevaDistribucion });
      } catch (_error) {
        setSyncLabel('No se pudo guardar la distribución horaria en el servidor.');
      }
      return;
    }
    if (action === 'agregar_profesional') {
      const newId = payload.idPrefijado || nuevoProfesionalId();
      await createProfessional(agenda.id, {
        id: newId,
        nombre: payload.nombre,
        tipo: payload.tipo || TIPOS_PROFESIONAL[0],
        nivelFormacion: payload.nivelFormacion || null,
        tieneTurno: payload.tieneTurno || false,
        rut: payload.rut || null,
        especialidad: payload.especialidad || null,
      });
      await refreshAgendaState(agenda.id);
      return newId;
    }
    if (action === 'quitar_profesional') {
      await deleteProfessional(agenda.id, payload.profesionalId);
      await refreshAgendaState(agenda.id);
      return;
    }
    if (action === 'confirmar_creacion') {
      // Antes de confirmar, se espera a que terminen de guardarse los cambios en cola.
      await colaEdicionesRef.current[agenda.id]?.cola;
      const updated = await confirmDraft(agenda.id);
      replaceAgendaState(updated);
      return;
    }
    if (action === 'renombrar_profesional') {
      await updateProfessional(agenda.id, payload.profesionalId, {
        nombre: payload.nombre,
        tipo: payload.tipo,
        nivelFormacion: payload.nivelFormacion,
        tieneTurno: payload.tieneTurno,
        rut: payload.rut ?? null,
        especialidad: payload.especialidad ?? null,
      });
      await refreshAgendaState(agenda.id);
      return;
    }
    if (action === 'limpiar_bloques_profesional') {
      const blocksToDelete = agenda.bloquesProf.filter((b) => b.profesionalId === payload.profesionalId);
      await Promise.all(blocksToDelete.map((block) => deleteBlock(agenda.id, block.id)));
      await refreshAgendaState(agenda.id);
      return;
    }
    if (action === 'agregar_bloque_prof') {
      // La fila aparece al instante; el guardado en el servidor va en segundo plano (cola).
      const idNuevo = nuevoBloqueId();
      updateAgenda(agenda.id, (a) => {
        a.bloquesProf = [...a.bloquesProf, {
          id: idNuevo, profesionalId: payload.profesionalId, dia: payload.dia, inicioMin: payload.inicioMin, duracionMin: payload.duracionMin,
          proceso: payload.proceso ?? null, actividad: payload.actividad ?? null, clinica: payload.clinica ?? true,
          tieneRendimiento: payload.tieneRendimiento ?? true, rendimiento: payload.rendimiento ?? 0, box: payload.box ?? null,
          observaciones: payload.observaciones ?? '', esTurno: payload.esTurno ?? false,
        }];
        return a;
      });
      encolarEdicion(agenda.id, () => createBlock(agenda.id, {
        id: idNuevo,
        profesionalId: payload.profesionalId,
        dia: payload.dia,
        inicioMin: payload.inicioMin,
        duracionMin: payload.duracionMin,
        proceso: payload.proceso ?? null,
        actividad: payload.actividad ?? null,
        clinica: payload.clinica ?? true,
        tieneRendimiento: payload.tieneRendimiento ?? true,
        rendimiento: payload.rendimiento ?? 0,
        box: payload.box ?? null,
        observaciones: payload.observaciones ?? '',
        esTurno: payload.esTurno ?? false,
      }));
      return;
    }
    if (action === 'editar_bloque_prof') {
      // Actualiza el estado local de inmediato (antes de esperar la red) para que columnas derivadas
      // como Duración reflejen el cambio al instante, en vez de esperar el viaje completo al servidor.
      updateAgenda(agenda.id, (a) => {
        // Asignar una actividad a un bloque de turno lo convierte en jornada (misma regla que el servidor).
        const pasaAJornada = payload.cambios.actividad && payload.cambios.esTurno === undefined;
        a.bloquesProf = a.bloquesProf.map((b) => (b.id === payload.bloqueId ? { ...b, ...payload.cambios, ...(pasaAJornada ? { esTurno: false } : {}) } : b));
        return a;
      });
      encolarEdicion(agenda.id, () => updateBlock(agenda.id, payload.bloqueId, payload.cambios));
      return;
    }
    if (action === 'eliminar_bloque_prof') {
      updateAgenda(agenda.id, (a) => { a.bloquesProf = a.bloquesProf.filter((b) => b.id !== payload.bloqueId); return a; });
      encolarEdicion(agenda.id, () => deleteBlock(agenda.id, payload.bloqueId));
      return;
    }
    if (action === 'enviar' || action === 'reenviar') {
      try {
        await colaEdicionesRef.current[agenda.id]?.cola;
        const updated = await transitionAgenda(agenda.id, 'enviada');
        replaceAgendaState(updated);
        setSelected(null);
        await refreshNotifications();
      } catch (_error) {
        setSyncLabel('Error al enviar agenda');
      }
      return;
    }
    if (action === 'aprobar') {
      try {
        const updated = await transitionAgenda(agenda.id, 'aprobada');
        replaceAgendaState(updated);
        setSelected(null);
        await refreshNotifications();
      } catch (_error) {
        setSyncLabel('Error al aprobar agenda');
      }
      return;
    }
    if (action === 'rechazar') {
      setPendingReject(agenda);
      return;
    }
    if (action === 'escalar') {
      try {
        const updated = await transitionAgenda(agenda.id, 'escalada');
        replaceAgendaState(updated);
        setSelected(null);
        await refreshNotifications();
      } catch (_error) {
        setSyncLabel('Error al escalar agenda');
      }
      return;
    }
    if (action === 'subir_alma') {
      try {
        const updated = await transitionAgenda(agenda.id, 'subida_alma');
        replaceAgendaState(updated);
        setSelected(null);
        await refreshNotifications();
      } catch (_error) {
        setSyncLabel('Error al marcar subida a ALMA');
      }
      return;
    }
    if (action === 'extender_vigencia') {
      try {
        const updated = await extendAgendaVigencia(agenda.id, payload.vigenciaHasta);
        replaceAgendaState(updated);
        await refreshNotifications();
      } catch (_error) {
        setSyncLabel('Error al extender la vigencia');
      }
      return;
    }
  }

  async function ejecutarRechazo(agenda, motivo) {
    try {
      const updated = await transitionAgenda(agenda.id, 'rechazada', motivo);
      replaceAgendaState(updated);
      setSelected(null);
      await refreshNotifications();
    } catch (_error) {
      setSyncLabel('Error al rechazar agenda');
    }
  }

  async function generarResumen(agenda) {
    setResumenLoading(true);
    const prompt = buildResumenPrompt(agenda);
    const texto = await callClaude([{ role: 'user', content: prompt }], 'Responde siempre en español, en texto plano, sin markdown.');
    updateAgenda(agenda.id, (a) => {
      a.resumenIA = texto;
      return a;
    });
    setSelected((s) => (s ? { ...s, resumenIA: texto } : s));
    setResumenLoading(false);
  }

  const selectedFresh = selected ? agendas.find((a) => a.id === selected.id) : null;
  const notifsForRole = notifs.filter((n) => n.role === role);
  const agendaBaseParaNuevo = agendas.filter((a) => a.servicio === miServicio && !a.pendienteConfirmar).sort((a, b) => b.lastUpdated - a.lastUpdated)[0] || null;
  const agendaEnEditor = showEditorFor ? agendas.find((a) => a.id === showEditorFor) : null;

  // Mientras se verifica la sesión y se descargan las agendas no hay nada real que mostrar: antes
  // se veía el tablero con los datos de demostración del prototipo (Cardiología / Dr. Rojas).
  if (!authReady) {
    return (
      <div className="w-full h-screen bg-[#F4F2ED] flex flex-col items-center justify-center gap-3 font-sans">
        <Loader2 size={28} className="animate-spin text-[#4C7C74]" />
        <div className="text-sm font-medium text-slate-700">Seguimiento de Agendas Institucionales</div>
        <div className="text-xs text-slate-500">Cargando agendas…</div>
      </div>
    );
  }

  if (!authUser) {
    return <LoginScreen onLogin={handleLogin} loading={authLoading} error={authError} />;
  }

  return (
    <div className="w-full h-screen bg-[#F4F2ED] flex flex-col font-sans text-slate-800 overflow-hidden print-reset-ancestor">
      <div className="bg-[#1E2E33] px-3 md:px-5 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 shrink-0 no-imprimir">
        <div className="min-w-0">
          <div className="text-white font-semibold text-sm tracking-tight">Seguimiento de Agendas Institucionales</div>
          <div className="text-[#9FB0B5] text-[11px] font-mono">DDI · Hospital San Juan de Dios de La Serena</div>
        </div>
        <div className="flex flex-wrap items-center gap-3 ml-auto">
          <div className={`hidden md:inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border ${
            backendStatus === 'online'
              ? 'bg-[#29453C] text-[#D6F5E7] border-[#4C7C74]'
              : backendStatus === 'offline'
                ? 'bg-[#4A352D] text-[#F5DED6] border-[#B6522F]'
                : 'bg-[#2A3E44] text-[#CBD5D9] border-[#3E545B]'
          }`}>
            {syncLabel}
          </div>
          {authUser && (
            <label className="flex items-center gap-1.5 text-[11px] text-[#9FB0B5]">
              <span className="hidden sm:inline">Periodo</span>
              <select
                value={periodo}
                onChange={(e) => setPeriodoElegido(Number(e.target.value))}
                style={{ background: '#2A3E44', border: '1px solid #3E545B' }}
                className="text-white text-xs font-semibold rounded-lg px-2 py-1.5"
                title="Periodo de programación que se muestra en toda la plataforma"
              >
                {opcionesPeriodo.map((p) => (
                  <option key={p} value={p}>{p}{periodosDisponibles.includes(p) ? '' : ' (sin agendas)'}</option>
                ))}
              </select>
            </label>
          )}
          <div className="relative">
            <button onClick={() => setShowNotifs((s) => !s)} className="relative text-[#CBD5D9] hover:text-white p-1.5">
              <Bell size={18} />
              {notifsForRole.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#B6522F] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{notifsForRole.length}</span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-9 w-72 bg-white rounded-xl border border-slate-200 shadow-lg z-50 max-h-72 overflow-y-auto">
                <div className="px-3.5 py-2.5 border-b border-slate-100 text-xs font-semibold text-slate-500">Notificaciones para este perfil</div>
                {notifsForRole.length === 0 && <div className="px-3.5 py-4 text-xs text-slate-400 italic">Sin notificaciones.</div>}
                {notifsForRole.map((n, i) => (
                  <div key={i} className="px-3.5 py-2.5 border-b border-slate-50 text-xs text-slate-600">
                    <div>{n.text}</div>
                    <div className="text-slate-400 mt-0.5">{n.fecha}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {role === 'jefe_servicio' && !authUser && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#9FB0B5] hidden sm:inline">Sesión: {JEFES_POR_SERVICIO[miServicio] || 'Jefe de Servicio'}</span>
              <div className="relative">
                <button
                  onClick={() => setShowServicioMenu((s) => !s)}
                  style={{ background: '#2A3E44', border: '1px solid #3E545B' }}
                  className="text-white text-xs font-medium rounded-lg pl-3 pr-7 py-2 relative"
                >
                  {miServicio}
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9FB0B5]" />
                </button>
                {showServicioMenu && (
                  <div className="absolute right-0 top-9 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                    {SERVICIOS.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setMiServicio(s); setShowServicioMenu(false); }}
                        className={`block w-full text-left px-3.5 py-2 text-xs ${s === miServicio ? 'font-semibold text-slate-800 bg-slate-50' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {PERSONA_POR_ROL[role] && (
            <span className="text-[11px] text-[#9FB0B5] hidden sm:inline">Sesión: {PERSONA_POR_ROL[role]}</span>
          )}
          <span className="hidden sm:inline text-[11px] text-[#CBD5D9]">{ROLES[role].label}</span>
          {authUser && (
            <button
              onClick={handleLogout}
              className="rounded-lg border border-[#3E545B] px-3 py-2 text-xs text-white hover:bg-[#2A3E44]"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 px-3 md:px-5 pt-3 shrink-0 no-imprimir overflow-x-auto">
        {[
          { id: 'tablero', label: 'Tablero', icon: LayoutGrid },
          { id: 'resumen', label: 'Resumen de Horas', icon: BarChart3 },
          { id: 'historial', label: 'Historial', icon: History },
          ...(role === 'admin' ? [{ id: 'usuarios', label: 'Usuarios', icon: Users }] : []),
          ...(HR_ROLES.includes(role) ? [{ id: 'rrhh', label: 'Recursos Humanos', icon: IdCard }] : []),
          ...(HR_ROLES.includes(role) ? [{ id: 'infraestructura', label: 'Infraestructura', icon: Building2 }] : []),
          ...(IMPORT_AGENDA_ROLES.includes(role) ? [{ id: 'cargar-agenda', label: 'Cargar Agenda', icon: UploadCloud }] : []),
          { id: 'docs', label: 'Documentos normativos', icon: FileText },
          { id: 'chat', label: 'Chat IA', icon: MessageSquare },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap shrink-0 ${tab === t.id ? 'bg-white text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white overflow-hidden no-imprimir">
        {isHydrated && authUser && agendasDelPeriodo.length === 0 && (
          <div className="mx-5 mt-4 rounded-xl border border-[#4C7C74]/30 bg-[#EBF5F2] px-4 py-3 text-xs text-[#2F6C5D] flex items-center justify-between gap-3 flex-wrap">
            <span>
              Aún no hay agendas cargadas para el periodo <b>{periodo}</b>. Puedes crear una con «Nueva agenda» (partiendo de la última versión del servicio) o cargarlas desde Excel.
            </span>
            {periodosDisponibles.length > 0 && (
              <button onClick={() => setPeriodoElegido(periodosDisponibles[0])} className="font-medium underline">
                Ver periodo {periodosDisponibles[0]}
              </button>
            )}
          </div>
        )}
        {tab === 'tablero' && (
          <div className="h-full overflow-x-auto p-4">
            <div className="flex gap-3 h-full min-w-max">
              {COLUMN_ORDER.map((estado) => (
                <div key={estado} className="w-60 flex flex-col shrink-0">
                  <div className="flex items-center justify-between mb-2 px-0.5">
                    <span className="text-xs font-semibold" style={{ color: ESTADOS[estado].color }}>{ESTADOS[estado].label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{columnas[estado].length}</span>
                  </div>
                  <div className="space-y-2 overflow-y-auto flex-1 pb-2">
                    {columnas[estado].map((a) => (
                      <AgendaCard key={a.id} agenda={a} onOpen={setSelected} />
                    ))}
                    {estado === 'borrador' && role === 'jefe_servicio' && (
                      <button
                        onClick={() => setShowNuevo(true)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl py-2.5 hover:border-slate-400 hover:text-slate-600"
                      >
                        <Plus size={13} /> Nueva agenda
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'resumen' && <ResumenDashboardTab agendas={agendasVisibles} periodo={periodo} periodos={opcionesPeriodo} />}
        {tab === 'historial' && <HistorialAgendasTab agendas={agendasVisibles} onAbrir={setSelected} />}
        {tab === 'usuarios' && role === 'admin' && (
          <UsuariosAdminTab
            users={usersCatalog}
            services={services}
            onCreateUser={handleCreateUser}
          />
        )}
        {tab === 'rrhh' && HR_ROLES.includes(role) && (
          <RecursosHumanosTab
            resumen={resumenRrhh}
            cargando={cargandoRrhh}
            error={errorRrhh}
            planta={plantaRrhh}
            onCambiarPlanta={setPlantaRrhh}
            onSubirPlanilla={handleUploadHrDotacion}
          />
        )}
        {tab === 'infraestructura' && HR_ROLES.includes(role) && (
          <InfraestructuraTab
            resumenPabellon={resumenPabellon}
            cargandoPabellon={cargandoPabellon}
            errorPabellon={errorPabellon}
            onSubirPlanillaPabellon={handleUploadPabellonPlan}
          />
        )}
        {tab === 'cargar-agenda' && IMPORT_AGENDA_ROLES.includes(role) && (
          <CargarAgendaTab agendas={agendasDelPeriodo} />
        )}
        {tab === 'docs' && <DocsTab />}
        {tab === 'chat' && <ChatIA />}
      </div>

      {selectedFresh && (
        <AgendaDetail
          agenda={selectedFresh}
          role={role}
          onClose={() => setSelected(null)}
          onAction={handleAction}
          onGenerarResumen={generarResumen}
          resumenLoading={resumenLoading}
          onAbrirEditor={() => { setShowEditorFor(selectedFresh.id); setSelected(null); }}
        />
      )}
      {showNuevo && (
        <NuevaAgendaModal
          servicio={miServicio}
          jefeNombre={JEFES_POR_SERVICIO[miServicio] || 'Jefe de Servicio'}
          agendaBase={agendaBaseParaNuevo}
          onClose={() => setShowNuevo(false)}
          onCreate={async (servicio, jefe, horas, mes, cnePct, atenciones, distribucion, profesionales, bloquesProf, vigenciaDesde, vigenciaHasta) => {
            const nueva = { ...makeAgenda(servicio, jefe, horas, mes, cnePct, atenciones, distribucion, profesionales, bloquesProf, true, vigenciaDesde, vigenciaHasta), periodo };
            try {
              const creada = await createAgenda(nueva);
              setAgendas((a) => [...a.filter((item) => item.id !== creada.id), creada]);
              setShowNuevo(false);
              setShowEditorFor(creada.id);
            } catch (_error) {
              setAgendas((a) => [...a, nueva]);
              setShowNuevo(false);
              setShowEditorFor(nueva.id);
              setSyncLabel('No se pudo crear la agenda en el servidor. Inténtalo de nuevo.');
            }
          }}
        />
      )}
      {agendaEnEditor && (
        <EditorProgramacion
          titulo={agendaEnEditor.servicio}
          subtitulo={`${agendaEnEditor.mes} · v${agendaEnEditor.version}`}
          estado={agendaEnEditor.estado}
          role={role}
          esNueva={agendaEnEditor.pendienteConfirmar}
          especialidad={services.find((s) => s.name === agendaEnEditor.servicio)?.specialtyCatalog || 'No Aplica'}
          servicioId={agendaEnEditor.servicioId}
          agendaId={agendaEnEditor.id}
          vigenciaDesde={agendaEnEditor.vigenciaDesde}
          vigenciaHasta={agendaEnEditor.vigenciaHasta}
          profesionales={agendaEnEditor.profesionales}
          bloques={agendaEnEditor.bloquesProf}
          cnePct={agendaEnEditor.cnePct}
          atenciones={agendaEnEditor.atenciones}
          onEditarCne={(valor) => handleAction('editar_cne', agendaEnEditor, { valor })}
          onEditarAtenciones={(valor) => handleAction('editar_atenciones', agendaEnEditor, { valor })}
          onGuardarBorrador={async (cerrar = false) => {
            await handleAction('confirmar_creacion', agendaEnEditor, {});
            if (cerrar) setShowEditorFor(null);
          }}
          onCerrar={() => setShowEditorFor(null)}
          onDescartar={async () => {
            try {
              await deleteAgenda(agendaEnEditor.id);
            } catch (_error) {
              setSyncLabel('No fue posible descartar la agenda en API');
            }
            setAgendas((prev) => prev.filter((a) => a.id !== agendaEnEditor.id));
            setShowEditorFor(null);
          }}
          onEnviar={async () => {
            await handleAction('enviar', agendaEnEditor);
            setShowEditorFor(null);
          }}
          onAgregarProfesional={async (nombre, tipoProf, nivelFormacion, tieneTurno, rut, especialidadProf) => {
            const nuevoId = nuevoProfesionalId();
            return handleAction('agregar_profesional', agendaEnEditor, { nombre, tipo: tipoProf, nivelFormacion, tieneTurno, rut, especialidad: especialidadProf, idPrefijado: nuevoId });
          }}
          onEliminarProfesional={async (profesionalId) => handleAction('quitar_profesional', agendaEnEditor, { profesionalId })}
          onRenombrarProfesional={async (profesionalId, nombre, tipoProf, nivelFormacion, tieneTurno, rut, especialidadProf) => handleAction('renombrar_profesional', agendaEnEditor, { profesionalId, nombre, tipo: tipoProf, nivelFormacion, tieneTurno, rut, especialidad: especialidadProf })}
          onLimpiarProfesional={async (profesionalId) => handleAction('limpiar_bloques_profesional', agendaEnEditor, { profesionalId })}
          onAgregarBloque={(profesionalId, anterior, siguiente) => {
            const valores = calcularInsercion(anterior, siguiente);
            return handleAction('agregar_bloque_prof', agendaEnEditor, { profesionalId, ...valores });
          }}
          onEditarBloque={(bloqueId, cambios) => handleAction('editar_bloque_prof', agendaEnEditor, { bloqueId, cambios })}
          onEliminarBloque={(bloqueId) => handleAction('eliminar_bloque_prof', agendaEnEditor, { bloqueId })}
          onAgregarTurno={(profesionalId, dia, inicioMin, duracionMin) => handleAction('agregar_bloque_prof', agendaEnEditor, {
            profesionalId, dia, inicioMin, duracionMin, esTurno: true, tieneRendimiento: false, rendimiento: 0,
          })}
        />
      )}
      {pendingReject && (
        <PromptDialog
          titulo="Motivo del rechazo"
          placeholder="Ej: faltan horas de procedimientos"
          onCancelar={() => setPendingReject(null)}
          onConfirmar={(motivo) => { ejecutarRechazo(pendingReject, motivo); setPendingReject(null); }}
        />
      )}
    </div>
  );
}
