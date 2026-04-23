/* eslint-disable jsx-a11y/alt-text */

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

import { calculateItemTotal } from '@/domain/quote.calculations';
import { Quote } from '@/domain/quote.types';
import { formatCurrency, formatDate } from '@/lib/formatters';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#fff',
    color: '#111827',
    fontSize: 10,
    padding: 28,
    fontFamily: 'Helvetica',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1d4ed8',
  },
  subtitle: {
    marginTop: 4,
    color: '#334155',
  },
  logo: {
    width: 72,
    height: 72,
    objectFit: 'contain',
  },
  section: {
    marginBottom: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
  },
  sectionTitle: {
    marginBottom: 6,
    color: '#0f172a',
    fontWeight: 700,
  },
  line: {
    marginBottom: 3,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 6,
    marginBottom: 6,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 5,
  },
  colCode: { width: '15%' },
  colName: { width: '35%' },
  colQty: { width: '12%', textAlign: 'right' },
  colUnit: { width: '10%', textAlign: 'center' },
  colPrice: { width: '14%', textAlign: 'right' },
  colTotal: { width: '14%', textAlign: 'right' },
  totalsBox: {
    marginTop: 12,
    marginLeft: '50%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 8,
    gap: 4,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  grandTotal: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 5,
    fontWeight: 700,
    color: '#1d4ed8',
  },
  notes: {
    marginTop: 4,
  },
  // notesText: {
  //   lineHeight: 1.5,
  //   whiteSpace: "pre-wrap",
  // },
});

type Props = {
  quote: Quote;
};

const details = (label: string, value: string): string =>
  `${label}: ${value || '-'}`;

export const QuotePdfDocument = ({ quote }: Props) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Orbicom - Orcamento Comercial</Text>
            <Text style={styles.subtitle}>{quote.quoteNumber}</Text>
            <Text style={styles.subtitle}>
              Emissao: {formatDate(quote.issueDate)}
            </Text>
          </View>
          {quote.company.logoDataUrl ? (
            <Image
              src={{ uri: quote.company.logoDataUrl }}
              style={styles.logo}
            />
          ) : null}
        </View>

        <View style={styles.row}>
          <View style={[styles.section, styles.half]}>
            <Text style={styles.sectionTitle}>Dados da Empresa</Text>
            <Text style={styles.line}>
              {details('Nome', quote.company.name)}
            </Text>
            <Text style={styles.line}>
              {details('CNPJ/CPF', quote.company.document)}
            </Text>
            <Text style={styles.line}>
              {details('Inscricao Estadual', quote.company.stateRegistration)}
            </Text>
            <Text style={styles.line}>
              {details('Telefone', quote.company.phone)}
            </Text>
            <Text style={styles.line}>
              {details('Endereco', quote.company.address)}
            </Text>
            <Text style={styles.line}>
              {details('CEP', quote.company.zipCode)}
            </Text>
            <Text style={styles.line}>
              {details(
                'Cidade/UF',
                `${quote.company.city} - ${quote.company.state}`,
              )}
            </Text>
          </View>

          <View style={[styles.section, styles.half]}>
            <Text style={styles.sectionTitle}>Dados do Cliente</Text>
            <Text style={styles.line}>
              {details('Nome', quote.client.name)}
            </Text>
            <Text style={styles.line}>
              {details('CNPJ/CPF', quote.client.document)}
            </Text>
            <Text style={styles.line}>
              {details('Inscricao Estadual', quote.client.stateRegistration)}
            </Text>
            <Text style={styles.line}>
              {details('Telefone', quote.client.phone)}
            </Text>
            <Text style={styles.line}>
              {details('Endereco', quote.client.address)}
            </Text>
            <Text style={styles.line}>
              {details('CEP', quote.client.zipCode)}
            </Text>
            <Text style={styles.line}>
              {details(
                'Cidade/UF',
                `${quote.client.city} - ${quote.client.state}`,
              )}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens da Proposta</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colCode}>Codigo</Text>
            <Text style={styles.colName}>Produto</Text>
            <Text style={styles.colQty}>Qtd.</Text>
            <Text style={styles.colUnit}>Un.</Text>
            <Text style={styles.colPrice}>Unit.</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>

          {quote.items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colCode}>{item.code}</Text>
              <Text style={styles.colName}>{item.name}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{item.unit}</Text>
              <Text style={styles.colPrice}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={styles.colTotal}>
                {formatCurrency(calculateItemTotal(item))}
              </Text>
            </View>
          ))}

          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text>Subtotal</Text>
              <Text>{formatCurrency(quote.totals.subtotal)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text>Desconto</Text>
              <Text>- {formatCurrency(quote.totals.discountAmount)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text>Frete</Text>
              <Text>{formatCurrency(quote.totals.freight)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text>Impostos</Text>
              <Text>{formatCurrency(quote.totals.taxAmount)}</Text>
            </View>
            <View style={[styles.totalsRow, styles.grandTotal]}>
              <Text>Total final</Text>
              <Text>{formatCurrency(quote.totals.total)}</Text>
            </View>
          </View>
        </View>

        {quote.notes ? (
          <View style={[styles.section, styles.notes]}>
            <Text style={styles.sectionTitle}>Observacoes Gerais</Text>
            <Text>{quote.notes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
};
