import { Helmet } from 'react-helmet-async';

const Meta = ({ title, description, keywords }) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name='description' content={description} />
      <meta name='keyword' content={keywords} />
    </Helmet>
  );
};

Meta.defaultProps = {
  title: 'Welcome to 2 Birds Shop',
  description: 'We sell the best products for cheap',
  keywords: 'dressing, buy clothings, cheap clothings',
};

export default Meta;
