const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const formatPaginatedResponse = (data, total, page, limit) => {
  const pages = Math.ceil(total / limit) || 1;
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
};

module.exports = {
  getPagination,
  formatPaginatedResponse,
};
