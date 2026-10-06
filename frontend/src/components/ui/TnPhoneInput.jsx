/**
 * TnPhoneInput — champ téléphone unique du site.
 *
 * Accepte « 074301639 », « 74 30 16 39 », « +241 74 30 16 39 »… et affiche
 * toujours « 074 30 16 39 ». Le parent reçoit la valeur affichée et la convertit
 * avec phoneForApi() au moment de l'envoi.
 */
import React from 'react';
import TnInput from './TnInput';
import { formatPhoneTyping, detectOperator, toLocalGabon } from '../../utils/phone';

const OPERATOR_NAMES = { airtel_money: 'Airtel', moov_money: 'Moov' };

export default function TnPhoneInput({
  name,
  value,
  onChange,
  label = 'Téléphone',
  placeholder = '074 30 16 39',
  helper,
  showOperator = false,
  ...rest
}) {
  const handleChange = (e) => {
    const formatted = formatPhoneTyping(e.target.value);
    onChange?.({ target: { name, value: formatted } });
  };

  const operator = showOperator && toLocalGabon(value).length === 9 ? detectOperator(value) : null;
  const effectiveHelper = operator ? `Numéro ${OPERATOR_NAMES[operator]}` : helper;

  return (
    <TnInput
      label={label}
      type="tel"
      name={name}
      value={value || ''}
      onChange={handleChange}
      placeholder={placeholder}
      inputMode="tel"
      autoComplete="tel-national"
      maxLength={20}
      leftIcon={<i className="fas fa-phone" />}
      helper={effectiveHelper}
      {...rest}
    />
  );
}
