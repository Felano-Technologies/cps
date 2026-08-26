import { Link } from 'react-router-dom';
import { ChevronDown, MessageCircle, ArrowRight } from 'lucide-react';
import '../../styles/faq.css';

const FAQS = [
  {
    question: 'How do I track my shipment?',
    answer:
      'You can track your package directly from our homepage using the tracking ID provided when your order was dispatched. If you created an account, you can also view all your active shipments in your dashboard.',
  },
  {
    question: 'What is the cutoff time for Same Day Delivery?',
    answer:
      'For same-day delivery, your request must be placed by 2:00 PM. Requests placed after 2:00 PM will automatically roll over to priority delivery the following morning.',
  },
  {
    question: 'Do you provide packing materials?',
    answer:
      'Currently, items must be properly boxed or bagged before our rider arrives. For regular merchants, we can provide branded poly-mailers for an additional fee.',
  },
  {
    question: 'What locations do you currently cover?',
    answer:
      'Our primary operations network covers the greater Kumasi area, including Ayeduase, KNUST, and surrounding zones. For bulk freight, we can arrange inter-city transport upon request.',
  },
];

export default function FAQPage() {
  return (
    <div className="page-shell light-shell">
      <main className="faq-hero container">
        <h1>Frequently Asked Questions</h1>
        <p className="lede">
          Everything you need to know about our logistics network, pricing, and how to get started.
        </p>
      </main>

      <section className="faq-list-wrap container">
        {FAQS.map(({ question, answer }) => (
          <details className="faq-item" key={question}>
            <summary>
              {question}
              <ChevronDown size={20} className="faq-chevron" />
            </summary>
            <div className="faq-content">{answer}</div>
          </details>
        ))}

        <div className="faq-more">
          <p>Still have questions?</p>
          <Link to="/contact" className="dark-btn">
            <MessageCircle size={16} /> Contact Us <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
